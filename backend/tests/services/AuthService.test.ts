import axios from 'axios';
import { AuthService } from '../../src/services/AuthService';
import { Provider } from '../../src/entities/AuthToken';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('getSpotifyAuthUrl', () => {
    it('should return a valid Spotify authorization URL', () => {
      const url = authService.getSpotifyAuthUrl();
      
      expect(url).toContain('https://accounts.spotify.com/authorize');
      expect(url).toContain('client_id=test_spotify_client_id');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=');
      expect(url).toContain('scope=');
    });
  });

  describe('getTmdbAuthUrl', () => {
    it('should return a valid TMDb authorization URL', () => {
      const url = authService.getTmdbAuthUrl();
      
      expect(url).toContain('https://www.themoviedb.org/authenticate/');
      expect(url).toContain('test_tmdb_key');
      expect(url).toContain('redirect_to=');
    });
  });

  describe('exchangeSpotifyCode', () => {
    it('should exchange Spotify code for tokens', async () => {
      const mockResponse = {
        data: {
          access_token: 'mock_access_token',
          refresh_token: 'mock_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'user-read-private user-read-email',
        },
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const mockSave = jest.fn().mockImplementation((token) => Promise.resolve(token));
      
      authService.tokenRepository = {
        findOne: mockFindOne,
        save: mockSave,
      };
      
      const result = await authService.exchangeSpotifyCode('mock_code', 'user_123');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://accounts.spotify.com/api/token',
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
      
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { userId: 'user_123', provider: Provider.SPOTIFY },
      });
      
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: Provider.SPOTIFY,
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
          tokenType: 'Bearer',
          scope: 'user-read-private user-read-email',
          isActive: true,
        }),
      );
      
      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user_123',
          provider: Provider.SPOTIFY,
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token',
        }),
      );
    });

    it('should update existing token if found', async () => {
      const mockResponse = {
        data: {
          access_token: 'new_access_token',
          refresh_token: 'new_refresh_token',
          expires_in: 3600,
          token_type: 'Bearer',
          scope: 'user-read-private user-read-email',
        },
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const existingToken = {
        id: 'token_123',
        userId: 'user_123',
        provider: Provider.SPOTIFY,
        accessToken: 'old_access_token',
        refreshToken: 'old_refresh_token',
        tokenType: 'Bearer',
        scope: 'user-read-private',
        expiresAt: new Date(),
        isActive: true,
      };
      
      const mockFindOne = jest.fn().mockResolvedValue(existingToken);
      const mockSave = jest.fn().mockImplementation((token) => Promise.resolve(token));
      
      authService.tokenRepository = {
        findOne: mockFindOne,
        save: mockSave,
      };
      
      const result = await authService.exchangeSpotifyCode('mock_code', 'user_123');
      
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { userId: 'user_123', provider: Provider.SPOTIFY },
      });
      
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'token_123',
          userId: 'user_123',
          provider: Provider.SPOTIFY,
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
        }),
      );
      
      expect(result).toEqual(
        expect.objectContaining({
          id: 'token_123',
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
        }),
      );
    });
  });

  describe('exchangeTmdbCode', () => {
    it('should exchange TMDb request token for session ID', async () => {
      const mockResponse = {
        data: {
          session_id: 'mock_session_id',
        },
      };
      
      mockedAxios.post.mockResolvedValueOnce(mockResponse);
      
      const mockFindOne = jest.fn().mockResolvedValue(null);
      const mockSave = jest.fn().mockImplementation((token) => Promise.resolve(token));
      
      authService.tokenRepository = {
        findOne: mockFindOne,
        save: mockSave,
      };
      
      const result = await authService.exchangeTmdbCode('mock_request_token', 'user_123');
      
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('https://api.themoviedb.org/3/authentication/session/new'),
        expect.objectContaining({
          request_token: 'mock_request_token',
        }),
      );
      
      expect(mockFindOne).toHaveBeenCalledWith({
        where: { userId: 'user_123', provider: Provider.TMDB },
      });
      
      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          provider: Provider.TMDB,
          accessToken: 'mock_session_id',
          tokenType: 'session',
          isActive: true,
        }),
      );
      
      expect(result).toEqual(
        expect.objectContaining({
          userId: 'user_123',
          provider: Provider.TMDB,
          accessToken: 'mock_session_id',
        }),
      );
    });
  });
});
