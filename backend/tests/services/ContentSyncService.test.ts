import axios from 'axios';
import { Repository } from 'typeorm';
import { ContentSyncService } from '../../src/services/ContentSyncService';
import { AuthService } from '../../src/services/AuthService';
import { Provider, AuthToken } from '../../src/entities/AuthToken';
import { MediaType, Item } from '../../src/entities/Item';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

jest.mock('../../src/services/AuthService');
const MockedAuthService = AuthService as jest.MockedClass<typeof AuthService>;

describe('ContentSyncService', () => {
  let contentSyncService: ContentSyncService;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    MockedAuthService.prototype.getValidToken = jest.fn().mockImplementation(
      (userId: string, provider: Provider) => {
        return Promise.resolve({
          id: 'token_123',
          userId,
          provider,
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          tokenType: 'Bearer',
          expiresAt: new Date(Date.now() + 3600000),
          isActive: true,
        });
      }
    );
    
    mockAuthService = new MockedAuthService() as jest.Mocked<AuthService>;
    
    contentSyncService = new ContentSyncService();
    contentSyncService.authService = mockAuthService;
  });

  describe('syncUserContent', () => {
    it('should fetch and save Spotify content', async () => {
      const mockSpotifyResponse = {
        data: {
          items: [
            {
              added_at: '2023-01-01T00:00:00Z',
              track: {
                id: 'track_123',
                name: 'Test Track',
                artists: [{ id: 'artist_123', name: 'Test Artist' }],
                album: {
                  id: 'album_123',
                  name: 'Test Album',
                  images: [{ url: 'https://example.com/image.jpg' }],
                },
                duration_ms: 180000,
                popularity: 80,
                preview_url: 'https://example.com/preview.mp3',
              },
            },
          ],
        },
      };
      
      mockedAxios.get.mockImplementation((url) => {
        if (url === 'https://api.spotify.com/v1/me/tracks') {
          return Promise.resolve(mockSpotifyResponse);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      
      const mockSave = jest.fn().mockImplementation((items) => Promise.resolve(items));
      contentSyncService.itemRepository = {
        save: mockSave,
      } as unknown as Repository<Item>;
      
      const result = await contentSyncService.syncUserContent('user_123', Provider.SPOTIFY);
      
      expect(MockedAuthService.prototype.getValidToken).toHaveBeenCalledWith('user_123', Provider.SPOTIFY);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.spotify.com/v1/me/tracks',
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock_access_token',
          },
          params: {
            limit: 20,
          },
        }),
      );
      
      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user_123',
            title: 'Test Track',
            type: MediaType.MUSIC,
            provider: Provider.SPOTIFY,
            externalId: 'track_123',
            metadata: expect.objectContaining({
              artists: expect.arrayContaining([
                expect.objectContaining({
                  id: 'artist_123',
                  name: 'Test Artist',
                }),
              ]),
              album: expect.objectContaining({
                id: 'album_123',
                name: 'Test Album',
              }),
            }),
          }),
        ]),
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Track');
    });

    it('should fetch and save TMDb content', async () => {
      const mockTmdbResponse = {
        data: {
          results: [
            {
              id: 123,
              title: 'Test Movie',
              overview: 'Test overview',
              release_date: '2023-01-01',
              poster_path: '/poster.jpg',
              backdrop_path: '/backdrop.jpg',
              vote_average: 8.5,
              vote_count: 1000,
              popularity: 90.5,
              genre_ids: [28, 12],
            },
          ],
        },
      };
      
      mockedAxios.get.mockImplementation((url) => {
        if (url.includes('https://api.themoviedb.org/3/account')) {
          return Promise.resolve(mockTmdbResponse);
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });
      
      const mockSave = jest.fn().mockImplementation((items) => Promise.resolve(items));
      contentSyncService.itemRepository = {
        save: mockSave,
      } as unknown as Repository<Item>;
      
      const result = await contentSyncService.syncUserContent('user_123', Provider.TMDB);
      
      expect(MockedAuthService.prototype.getValidToken).toHaveBeenCalledWith('user_123', Provider.TMDB);
      
      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('https://api.themoviedb.org/3/account/{account_id}/favorite/movies'),
        expect.objectContaining({
          headers: {
            Authorization: 'Bearer mock_access_token',
          },
          params: expect.objectContaining({
            session_id: 'mock_access_token',
          }),
        }),
      );
      
      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            userId: 'user_123',
            title: 'Test Movie',
            type: MediaType.FILM,
            provider: Provider.TMDB,
            externalId: '123',
            metadata: expect.objectContaining({
              overview: 'Test overview',
              release_date: '2023-01-01',
              poster_path: '/poster.jpg',
              vote_average: 8.5,
            }),
          }),
        ]),
      );
      
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Test Movie');
    });

    it('should throw an error if no valid token is found', async () => {
      MockedAuthService.prototype.getValidToken = jest.fn().mockResolvedValue(null);
      
      const testService = new ContentSyncService();
      testService.authService = new MockedAuthService() as jest.Mocked<AuthService>;
      
      await expect(testService.syncUserContent('user_123', Provider.SPOTIFY)).rejects.toThrow(
        'No valid token found for user user_123 and provider spotify'
      );
      
      expect(MockedAuthService.prototype.getValidToken).toHaveBeenCalledWith('user_123', Provider.SPOTIFY);
    });
  });

  describe('scheduleContentSync', () => {
    it('should sync content for all active tokens', async () => {
      const mockTokens = [
        { userId: 'user_123', provider: Provider.SPOTIFY, isActive: true },
        { userId: 'user_123', provider: Provider.TMDB, isActive: true },
      ];
      
      const mockFind = jest.fn().mockResolvedValue(mockTokens);
      contentSyncService.tokenRepository = {
        find: mockFind,
      } as unknown as Repository<AuthToken>;
      
      const mockSyncUserContent = jest.fn().mockResolvedValue([]);
      contentSyncService.syncUserContent = mockSyncUserContent;
      
      await contentSyncService.scheduleContentSync('user_123');
      
      expect(mockFind).toHaveBeenCalledWith({
        where: { userId: 'user_123', isActive: true },
      });
      
      expect(mockSyncUserContent).toHaveBeenCalledTimes(2);
      expect(mockSyncUserContent).toHaveBeenCalledWith('user_123', Provider.SPOTIFY);
      expect(mockSyncUserContent).toHaveBeenCalledWith('user_123', Provider.TMDB);
    });
  });
});
