import axios from 'axios';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthToken, Provider } from '../entities/AuthToken';
import { Item, MediaType } from '../entities/Item';
import { AuthService } from './AuthService';

export class ContentSyncService {
  private userRepository: Repository<User>;
  private tokenRepository: Repository<AuthToken>;
  private itemRepository: Repository<Item>;
  private authService: AuthService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.tokenRepository = AppDataSource.getRepository(AuthToken);
    this.itemRepository = AppDataSource.getRepository(Item);
    this.authService = new AuthService();
  }

  async syncUserContent(userId: string, provider: Provider): Promise<Item[]> {
    const token = await this.authService.getValidToken(userId, provider);
    if (!token) {
      throw new Error(`No valid token found for user ${userId} and provider ${provider}`);
    }

    let items: Item[] = [];
    if (provider === Provider.SPOTIFY) {
      items = await this.fetchSpotifyContent(userId, token.accessToken);
    } else if (provider === Provider.TMDB) {
      items = await this.fetchTmdbContent(userId, token.accessToken);
    }

    return this.itemRepository.save(items);
  }

  private async fetchSpotifyContent(userId: string, accessToken: string): Promise<Item[]> {
    try {
      const response = await axios.get('https://api.spotify.com/v1/me/tracks', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        params: {
          limit: 20,
        },
      });

      return response.data.items.map((item: any) => {
        const track = item.track;
        const newItem = new Item();
        newItem.userId = userId;
        newItem.title = track.name;
        newItem.type = MediaType.MUSIC;
        newItem.provider = Provider.SPOTIFY;
        newItem.externalId = track.id;
        newItem.metadata = {
          artists: track.artists.map((artist: any) => ({
            id: artist.id,
            name: artist.name,
          })),
          album: {
            id: track.album.id,
            name: track.album.name,
            images: track.album.images,
          },
          duration_ms: track.duration_ms,
          popularity: track.popularity,
          preview_url: track.preview_url,
          added_at: item.added_at,
        };
        return newItem;
      });
    } catch (error) {
      console.error('Error fetching Spotify content:', error);
      throw new Error('Failed to fetch content from Spotify');
    }
  }

  private async fetchTmdbContent(userId: string, accessToken: string): Promise<Item[]> {
    try {
      const apiKey = process.env.TMDB_KEY;
      
      const response = await axios.get(
        `https://api.themoviedb.org/3/account/{account_id}/favorite/movies`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          params: {
            api_key: apiKey,
            session_id: accessToken,
            language: 'en-US',
            sort_by: 'created_at.desc',
            page: 1,
          },
        },
      );

      return response.data.results.map((movie: any) => {
        const newItem = new Item();
        newItem.userId = userId;
        newItem.title = movie.title;
        newItem.type = MediaType.FILM;
        newItem.provider = Provider.TMDB;
        newItem.externalId = movie.id.toString();
        newItem.metadata = {
          overview: movie.overview,
          release_date: movie.release_date,
          poster_path: movie.poster_path,
          backdrop_path: movie.backdrop_path,
          vote_average: movie.vote_average,
          vote_count: movie.vote_count,
          popularity: movie.popularity,
          genre_ids: movie.genre_ids,
        };
        return newItem;
      });
    } catch (error) {
      console.error('Error fetching TMDb content:', error);
      throw new Error('Failed to fetch content from TMDb');
    }
  }

  async scheduleContentSync(userId: string): Promise<void> {
    try {
      const tokens = await this.tokenRepository.find({
        where: { userId, isActive: true },
      });

      for (const token of tokens) {
        await this.syncUserContent(userId, token.provider);
      }
    } catch (error) {
      console.error('Error scheduling content sync:', error);
      throw new Error('Failed to schedule content sync');
    }
  }
}
