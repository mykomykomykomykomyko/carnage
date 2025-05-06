import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';

const app = express();
app.use(cors());
app.use(express.json());

// API key for Anthropic's Claude API
const API_KEY = 'put your key';

// Set a shorter timeout for the API requests
const API_TIMEOUT = 15000; // 15 seconds

// Claude API endpoint
app.post('/api/claude', async (req, res) => {
  try {
    // Ensure we don't request ASCII art
    if (req.body.system && !req.body.system.includes('Never respond with ASCII art')) {
      req.body.system += '\n\nIMPORTANT: Never respond with ASCII art or text banners. Keep responses direct and concise.';
    }
    
    // Set lower max_tokens if not specified to speed up response time
    if (!req.body.max_tokens || req.body.max_tokens > 500) {
      req.body.max_tokens = 500;
    }
    
    // Create an AbortController to enable request timeouts
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    
    // Clear the timeout since the request completed
    clearTimeout(timeoutId);
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (err) {
    console.error('Error in /api/claude endpoint:', err);
    // Check if it was a timeout error
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'request timeout', message: 'The API request timed out' });
    }
    res.status(500).json({ error: 'proxy failed', message: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).send('Server is running');
});

// Export the Express API for Vercel
export default app;
