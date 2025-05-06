import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests for the actual API call
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get the API key from environment variables
    const API_KEY = process.env.CLAUDE_API_KEY;
    
    // Check if API key is configured
    if (!API_KEY) {
      console.error('API key is not configured');
      return res.status(500).json({
        error: 'Missing API key',
        message: 'The Claude API key is not configured'
      });
    }
    
    // Extract parameters from request body
    const { system, messages, model = 'claude-3-opus-20240229' } = req.body;
    
    // Validate request
    if (!messages || !Array.isArray(messages)) {
      console.error('Invalid request: messages array is missing or not an array');
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Messages array is required'
      });
    }
    
    console.log('Making request to Claude API with:', {
      model,
      messageCount: messages.length,
      hasSystem: !!system
    });
    
    // Prepare request to Claude API
    const requestBody = {
      model,
      max_tokens: 500,
      messages,
      temperature: 0.7
    };
    
    // Add system prompt if provided
    if (system) {
      requestBody.system = system;
    }
    
    // Make request to Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });
    
    // Handle errors
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      
      return res.status(response.status).json({
        error: 'Claude API error',
        status: response.status,
        message: `Claude API returned an error: ${response.status}`
      });
    }
    
    // Get response data
    const data = await response.json();
    console.log('Received response from Claude API');
    
    // Return the response to the client
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error in Claude API handler:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
