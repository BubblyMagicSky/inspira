import express, { Request, Response, Router } from 'express';
import { AuthService } from '../services/AuthService';

const router: Router = express.Router();
const authService = new AuthService();

router.get('/spotify', (req: Request, res: Response) => {
  try {
    const authUrl = authService.getSpotifyAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating Spotify auth URL:', error);
    res.status(500).json({ error: 'Failed to generate Spotify authorization URL' });
  }
});

router.get('/spotify/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.query;
    const userId = req.headers['x-user-id'] as string; // In a real app, this would come from authentication middleware

    if (!code || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await authService.exchangeSpotifyCode(code as string, userId);
    res.redirect('/dashboard?provider=spotify&status=success');
  } catch (error) {
    console.error('Error handling Spotify callback:', error);
    res.redirect('/dashboard?provider=spotify&status=error');
  }
});

router.get('/tmdb', (req: Request, res: Response) => {
  try {
    const authUrl = authService.getTmdbAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error generating TMDb auth URL:', error);
    res.status(500).json({ error: 'Failed to generate TMDb authorization URL' });
  }
});

router.get('/tmdb/callback', async (req: Request, res: Response) => {
  try {
    const { request_token } = req.query;
    const userId = req.headers['x-user-id'] as string; // In a real app, this would come from authentication middleware

    if (!request_token || !userId) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await authService.exchangeTmdbCode(request_token as string, userId);
    res.redirect('/dashboard?provider=tmdb&status=success');
  } catch (error) {
    console.error('Error handling TMDb callback:', error);
    res.redirect('/dashboard?provider=tmdb&status=error');
  }
});

export default router;
