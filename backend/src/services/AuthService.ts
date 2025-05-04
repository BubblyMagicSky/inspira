import axios from 'axios';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { AuthToken, Provider } from '../entities/AuthToken';

export class AuthService {
  public userRepository: Repository<User>;
  public tokenRepository: Repository<AuthToken>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.tokenRepository = AppDataSource.getRepository(AuthToken);
  }

  getSpotifyAuthUrl(): string {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;
    const scopes = ['user-read-private', 'user-read-email', 'user-library-read'];

    return `https://accounts.spotify.com/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri || '',
    )}&scope=${encodeURIComponent(scopes.join(' '))}`;
  }

  getTmdbAuthUrl(): string {
    const apiKey = process.env.TMDB_KEY;
    const redirectUri = process.env.TMDB_REDIRECT_URI;

    return `https://www.themoviedb.org/authenticate/${apiKey}?redirect_to=${encodeURIComponent(
      redirectUri || '',
    )}`;
  }

  async exchangeSpotifyCode(code: string, userId: string): Promise<AuthToken> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, refresh_token, expires_in, token_type, scope } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      let token = await this.tokenRepository.findOne({
        where: { userId, provider: Provider.SPOTIFY },
      });

      if (!token) {
        token = new AuthToken();
        token.userId = userId;
        token.provider = Provider.SPOTIFY;
      }

      token.accessToken = access_token;
      token.refreshToken = refresh_token;
      token.tokenType = token_type;
      token.scope = scope;
      token.expiresAt = expiresAt;
      token.isActive = true;

      return this.tokenRepository.save(token);
    } catch (error) {
      console.error('Error exchanging Spotify code:', error);
      throw new Error('Failed to exchange Spotify authorization code');
    }
  }

  async exchangeTmdbCode(requestToken: string, userId: string): Promise<AuthToken> {
    const apiKey = process.env.TMDB_KEY;

    try {
      const response = await axios.post(
        `https://api.themoviedb.org/3/authentication/session/new?api_key=${apiKey}`,
        {
          request_token: requestToken,
        },
      );

      const { session_id } = response.data;

      let token = await this.tokenRepository.findOne({
        where: { userId, provider: Provider.TMDB },
      });

      if (!token) {
        token = new AuthToken();
        token.userId = userId;
        token.provider = Provider.TMDB;
      }

      token.accessToken = session_id;
      token.tokenType = 'session';
      token.isActive = true;

      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      token.expiresAt = expiresAt;

      return this.tokenRepository.save(token);
    } catch (error) {
      console.error('Error exchanging TMDb code:', error);
      throw new Error('Failed to exchange TMDb authorization code');
    }
  }

  async getValidToken(userId: string, provider: Provider): Promise<AuthToken | null> {
    const token = await this.tokenRepository.findOne({
      where: { userId, provider, isActive: true },
    });

    if (!token) {
      return null;
    }

    if (token.isExpired()) {
      if (provider === Provider.SPOTIFY && token.refreshToken) {
        return this.refreshSpotifyToken(token);
      }
      return null;
    }

    return token;
  }

  private async refreshSpotifyToken(token: AuthToken): Promise<AuthToken> {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;

    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: token.refreshToken || '',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
        },
      );

      const { access_token, refresh_token, expires_in } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + expires_in);

      token.accessToken = access_token;
      if (refresh_token) {
        token.refreshToken = refresh_token;
      }
      token.expiresAt = expiresAt;

      return this.tokenRepository.save(token);
    } catch (error) {
      console.error('Error refreshing Spotify token:', error);
      token.isActive = false;
      await this.tokenRepository.save(token);
      throw new Error('Failed to refresh Spotify token');
    }
  }
}
