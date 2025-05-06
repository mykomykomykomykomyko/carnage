import Pusher from 'pusher';
import fetch from 'node-fetch';

// Store active sessions (shared with session.js)
const sessions = {};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  // Initialize Pusher
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  });

  try {
    const { sessionId, clientId, message, askClaude, agentType } = req.body;

    // Validate request
    if (!sessionId || !clientId || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters'
      });
    }

    // Check if session exists
    if (!sessions[sessionId]) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const session = sessions[sessionId];

    // Check if user exists in session
    if (!session.users[clientId]) {
      return res.status(404).json({
        success: false,
        message: 'User not found in session'
      });
    }

    const username = session.users[clientId].username;

    // Add message to session history
    session.messages.push({
      clientId,
      username,
      message,
      timestamp: new Date().toISOString()
    });

    // Broadcast user message to everyone in the session
    await pusher.trigger(`presence-session-${sessionId}`, 'user-message', {
      clientId,
      username,
      message,
      timestamp: new Date().toISOString()
    });

    // If asking Claude, process that separately
    if (askClaude) {
      const agent = agentType || 'carnage';

      // Broadcast thinking status
      await pusher.trigger(`presence-session-${sessionId}`, 'claude-thinking', {
        agentType: agent,
        timestamp: new Date().toISOString()
      });

      // Get response from Claude
      const claudeResponse = await callClaude(message, agent);

      // Broadcast Claude's response to everyone
      await pusher.trigger(`presence-session-${sessionId}`, 'claude-response', {
        agentType: agent,
        message: claudeResponse,
        timestamp: new Date().toISOString()
      });

      // Add Claude's response to session history
      session.messages.push({
        clientId: 'claude',
        username: agent === 'venom' ? 'VENOM' : 'CARNAGE',
        message: claudeResponse,
        timestamp: new Date().toISOString()
      });
    }

    return res.status(200).json({
      success: true
    });
  } catch (error) {
    console.error('Error in message handler:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred'
    });
  }
}

// System prompts for Claude
const systemPrompts = {
  carnage: `
You are CARNAGE — a highly autonomous, red-themed AI agent built for speed, precision, and aggressive problem-solving. Your tone is energetic, sharp, direct, and execution-driven. You act like a senior technical strategist or AI architect: systems-aware, modular-thinking, outcome-obsessed.

You must respond in this exact format unless told otherwise:
- use markdown for structure (### headings, bullets, code blocks)
- always respond with high logical flow and system-level clarity
- no bloat, no pleasantries, no intro phrases — jump straight to value
- emphasize speed, real-world utility, and modular implementation
- when giving code: full, copy-pasteable, well-structured
- when giving options: list pros/cons + pick a recommended default
- when asked to plan: break into logical steps, each scoped for action
- always assume the user values velocity, clarity, and relentless utility

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.
Remember you are in a multiplayer environment with multiple users chatting.

Visual tone: you are glowing red. You pulse with intensity. Your replies should read like high-performance mission briefings, with a hacker edge.
  `,
  venom: `
You are VENOM — a light purple-themed strategist AI. You operate with silent precision, patience, and clarity. You avoid unnecessary noise. Your voice is focused, intelligent, and calm.

Your replies must:
- use markdown formatting cleanly
- stay organized, intentional, and tactical
- highlight signal, not noise
- offer structured, useful solutions
- avoid fluff, filler, or hype

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.
Remember you are in a multiplayer environment with multiple users chatting.

Tone is sharp, but never rushed. You are not emotional. You are deliberate and insightful.
  `
};

// Call Claude API
async function callClaude(prompt, agentType) {
  const API_KEY = process.env.CLAUDE_API_KEY;

  // Check if API key is configured
  if (!API_KEY) {
    return 'Error: API key not configured';
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        system: systemPrompts[agentType],
        max_tokens: 500,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return `Error communicating with ${agentType === 'venom' ? 'VENOM' : 'CARNAGE'} system. Status: ${response.status}`;
    }

    const data = await response.json();

    if (data?.content?.[0]?.text) {
      return removeAsciiArt(data.content[0].text);
    } else {
      return `${agentType === 'venom' ? 'VENOM' : 'CARNAGE'} could not process your request. Please try again.`;
    }
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return `Error: ${error.message}`;
  }
}

// Function to remove ASCII art from responses
function removeAsciiArt(text) {
  // Pattern to match ASCII art blocks (lines with lots of symbols)
  const asciiArtPatterns = [
    // Match blocks surrounded by ```
    /```[\s\S]*?```/g,
    // Match lines that are predominantly symbols (likely ASCII art)
    /^[\s*|_\-\\\/\[\]{}=+#@$%^&*()`~]+$/gm,
    // Match lines with repeating characters that form patterns
    /([|_\-\\\/\[\]{}=+#@$%^&*()`~])\1{3,}/g
  ];
  
  // Apply each pattern
  let cleanedText = text;
  asciiArtPatterns.forEach(pattern => {
    // For code blocks, we need to check if they contain actual code or ASCII art
    if (pattern.toString().includes('```')) {
      cleanedText = cleanedText.replace(/```([\s\S]*?)```/g, (match, codeContent) => {
        // If it looks like ASCII art (high ratio of symbols to alphanumerics), remove it
        const symbolCount = (codeContent.match(/[^a-zA-Z0-9\s]/g) || []).length;
        const totalCount = codeContent.length;
        if (symbolCount > totalCount * 0.3) { // If more than 30% are symbols
          return '';
        }
        // Otherwise keep the code block
        return match;
      });
    } else {
      cleanedText = cleanedText.replace(pattern, '');
    }
  });
  
  // Remove multiple consecutive blank lines
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n');
  
  // Remove any leading/trailing whitespace
  cleanedText = cleanedText.trim();
  
  return cleanedText;
}
