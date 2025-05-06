import fetch from 'node-fetch';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Get API key from environment variables
    const API_KEY = process.env.CLAUDE_API_KEY;
    
    // Check if API key is configured
    if (!API_KEY) {
      return res.status(500).json({ 
        error: 'server_configuration_error', 
        message: 'API key not configured on server'
      });
    }
    
    const { system, messages, max_tokens, temperature, model } = req.body;
    
    // Validate request body
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Messages array is required'
      });
    }
    
    // Set default model if not provided
    const claudeModel = model || 'claude-3-opus-20240229';
    
    // Set default max tokens if not provided or too high
    const tokens = max_tokens && max_tokens <= 4000 ? max_tokens : 500;
    
    // Prepare request to Anthropic API
    const anthropicRequest = {
      model: claudeModel,
      max_tokens: tokens,
      temperature: temperature || 0.7,
      messages: messages
    };
    
    // Add system prompt if provided
    if (system) {
      // Add ASCII art prevention if not already included
      let systemPrompt = system;
      if (!system.includes('Never respond with ASCII art')) {
        systemPrompt += '\n\nIMPORTANT: Never respond with ASCII art or text banners. Keep responses direct and concise.';
      }
      anthropicRequest.system = systemPrompt;
    }
    
    // Set timeout to 15 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    // Make request to Anthropic API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(anthropicRequest),
      signal: controller.signal
    });
    
    // Clear timeout
    clearTimeout(timeoutId);
    
    // Check for successful response
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      return res.status(response.status).json({
        error: 'anthropic_api_error',
        message: errorData?.error?.message || `API returned status ${response.status}`,
        status: response.status
      });
    }
    
    // Parse and return response
    const data = await response.json();
    return res.status(200).json(data);
    
  } catch (error) {
    console.error('Error in Claude API handler:', error);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'timeout',
        message: 'Request to Claude API timed out'
      });
    }
    
    // Handle other errors
    return res.status(500).json({
      error: 'server_error',
      message: error.message || 'An unexpected error occurred'
    });
  }
}
