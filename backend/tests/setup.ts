import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(process.cwd(), '.env.test');
dotenv.config({ path: envPath });

process.env.NODE_ENV = 'test';
process.env.USE_DB_STUB = 'true';
process.env.SPOTIFY_CLIENT_ID = 'test_spotify_client_id';
process.env.SPOTIFY_CLIENT_SECRET = 'test_spotify_client_secret';
process.env.SPOTIFY_REDIRECT_URI = 'http://localhost:3000/api/auth/spotify/callback';
process.env.TMDB_KEY = 'test_tmdb_key';
process.env.TMDB_REDIRECT_URI = 'http://localhost:3000/api/auth/tmdb/callback';
