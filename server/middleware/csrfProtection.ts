
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// CSRF token storage (in-memory for development)
// În producție, ar trebui să folosim Redis sau alt tip de stocare distribuită
const csrfTokens = new Map<string, { token: string, timestamp: number }>();

// Generates a new CSRF token
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

// Clean up expired tokens (older than 24 hours)
function cleanupExpiredTokens() {
  const now = Date.now();
  const expirationTime = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  for (const [tokenId, tokenData] of csrfTokens.entries()) {
    if (now - tokenData.timestamp > expirationTime) {
      csrfTokens.delete(tokenId);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

// Middleware to inject CSRF token for GET requests
export function csrfTokenInjector(req: Request, res: Response, next: NextFunction) {
  try {
    // Special case for healthcheck endpoint - always generate a new token
    if (req.path === '/api/health-check') {
      const token = generateCsrfToken();
      const tokenId = crypto.randomBytes(16).toString('hex');

      // Store the token with its ID and timestamp
      csrfTokens.set(tokenId, { 
        token, 
        timestamp: Date.now() 
      });

      // Set the token in the response headers
      res.setHeader('X-CSRF-Token', token);
      res.cookie('csrf_token_id', tokenId, { 
        httpOnly: true,
        secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      console.log('[Security] Health check accessed - CSRF token generated:', token.substring(0, 8) + '...');
    }
    // For other GET requests, only generate token if needed
    else if (req.method === 'GET') {
      // Check if client already has a token ID in cookies
      const existingTokenId = req.cookies?.csrf_token_id;

      if (!existingTokenId || !csrfTokens.has(existingTokenId)) {
        // Generate a new token if needed
        const token = generateCsrfToken();
        const tokenId = crypto.randomBytes(16).toString('hex');

        // Store the token with its ID and timestamp
        csrfTokens.set(tokenId, { 
          token, 
          timestamp: Date.now() 
        });

        // Set the token in the response headers and cookies
        res.setHeader('X-CSRF-Token', token);
        res.cookie('csrf_token_id', tokenId, { 
          httpOnly: true,
          secure: req.secure || req.headers['x-forwarded-proto'] === 'https',
          sameSite: 'strict',
          maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });
      } else {
        // Use existing token if the client already has one
        const tokenData = csrfTokens.get(existingTokenId);
        if (tokenData) {
          res.setHeader('X-CSRF-Token', tokenData.token);
        }
      }
    }

    // Clean up old tokens if we have too many
    if (csrfTokens.size > 1000) {
      cleanupExpiredTokens();

      // If still too many after cleanup, delete oldest tokens
      if (csrfTokens.size > 800) {
        const entries = Array.from(csrfTokens.entries());
        entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

        // Delete the 300 oldest entries
        for (let i = 0; i < 300 && i < entries.length; i++) {
          csrfTokens.delete(entries[i][0]);
        }
      }
    }
  } catch (error) {
    console.error('Error in CSRF token injector:', error);
  }

  next();
}

// Middleware to protect against CSRF
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // Skip for GET, HEAD, OPTIONS (safe methods)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  try {
    // Get the token from the request header
    const csrfToken = req.headers['x-csrf-token'] as string;

    // Get token ID from cookie
    const tokenId = req.cookies?.csrf_token_id;

    if (!csrfToken) {
      return res.status(403).json({ error: 'CSRF token missing' });
    }

    if (!tokenId) {
      return res.status(403).json({ error: 'CSRF token ID missing' });
    }

    // Check if token is valid
    const tokenData = csrfTokens.get(tokenId);

    if (!tokenData || tokenData.token !== csrfToken) {
      // Generate a new token for the client to use in future requests
      const newToken = generateCsrfToken();
      csrfTokens.set(tokenId, { 
        token: newToken, 
        timestamp: Date.now() 
      });

      res.setHeader('X-CSRF-Token', newToken);
      return res.status(403).json({ error: 'Invalid CSRF token' });
    }

    // Update token timestamp to mark it as recently used
    tokenData.timestamp = Date.now();
    csrfTokens.set(tokenId, tokenData);

    next();
  } catch (error) {
    console.error('CSRF protection error:', error);
    res.status(403).json({ error: 'CSRF validation failed' });
  }
}
