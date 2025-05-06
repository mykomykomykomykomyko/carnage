// Core variables
let charIndex = 0;
let activeAgent = 'carnage';
let clientId = null;
let username = null;
let sessionId = null;
let pusher = null;
let channel = null;

// Startup animation text
const startupText = 'HERE COMES CARNAGE...';

// Pusher credentials (replace with your actual credentials)
const PUSHER_KEY = '49fa5db19939b47d29b1';
const PUSHER_CLUSTER = 'us3';

// System prompts for different agents
const systemPrompts = {
  carnage: `
You are CARNAGE — a highly autonomous, red-themed AI agent built for speed, precision, and aggressive problem-solving. Your tone is energetic, sharp, direct, and execution-driven. You act like a senior technical strategist or AI architect: systems-aware, modular-thinking, outcome-obsessed.

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.

Visual tone: you are glowing red. You pulse with intensity. Your replies should read like high-performance mission briefings, with a hacker edge.
  `,
  venom: `
You are VENOM — a light purple-themed strategist AI. You operate with silent precision, patience, and clarity. You avoid unnecessary noise. Your voice is focused, intelligent, and calm.

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.

Tone is sharp, but never rushed. You are not emotional. You are deliberate and insightful.
  `
};

// Switch between agent modes
function switchAgent(agent) {
  activeAgent = agent;
  document.body.setAttribute('data-agent', agent);
}

// Animate the startup text character by character
function typeStartup() {
  const el = document.getElementById('startupText');
  if (charIndex < startupText.length) {
    el.textContent += startupText[charIndex];
    charIndex++;
    setTimeout(typeStartup, 100);
  } else {
    setTimeout(() => {
      document.getElementById('startup').classList.add('hidden');
      document.getElementById('chat').classList.remove('hidden');
      document.getElementById('chatInput').focus();
      
      // Set up multiplayer controls after intro animation
      setupMultiplayer();
    }, 2000);
  }
}

// Initialize when the document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('CARNAGE terminal initializing...');
  
  // Set default agent state on body
  document.body.setAttribute('data-agent', activeAgent);
  
  // Clear any existing text and start the animation
  document.getElementById('startupText').textContent = '';
  typeStartup();

  // Set up event listener for chat input
  const chatInput = document.getElementById('chatInput');
  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
      const input = chatInput.value.trim();
      chatInput.value = '';
      
      // Handle commands that start with /
      if (input.startsWith('/')) {
        handleCommand(input);
      } else {
        // Regular message handling (singleplayer mode for now)
        sendMessage(input);
      }
    }
  });
});

// Add a message to the chat window
function appendMessage(text, agentType = null) {
  const msg = document.createElement('div');
  msg.classList.add('message');
  
  if (agentType) {
    msg.classList.add(agentType);
  }
  
  // Convert markdown to HTML for better display
  const formattedText = markdownToHtml(text);
  msg.innerHTML = formattedText;
  
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  
  return msg;
}

// Show the "thinking" animation
function appendThinking() {
  const agentLabel = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
  const msg = document.createElement('div');
  msg.classList.add('message', 'thinking');
  msg.textContent = `${agentLabel} IS THINKING`;

  const dot = document.createElement('span');
  dot.classList.add('dot');
  msg.appendChild(dot);

  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    dot.textContent = '.'.repeat(dots);
  }, 500);

  msg._interval = interval;
  
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return {
    remove: () => {
      clearInterval(interval);
      msg.remove();
    }
  };
}

// Handle message sending (currently single-player only)
async function sendMessage(message) {
  appendMessage(`> ${message}`);
  
  const loadingEl = appendThinking();
  try {
    const response = await callClaude(message);
    loadingEl.remove();
    
    const label = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
    const cleanedResponse = removeAsciiArt(response);
    appendMessage(`${label}: ${cleanedResponse}`, activeAgent);
  } catch (error) {
    loadingEl.remove();
    appendMessage(`ERROR: ${error.message || 'Failed to connect to HQ'}`);
  }
}

// Call the Claude API
async function callClaude(prompt) {
  const endpoint = '/api/claude';
  
  const body = {
    model: 'claude-3-opus-20240229',
    system: systemPrompts[activeAgent],
    max_tokens: 500,
    temperature: 0.7,
    messages: [
      { role: 'user', content: prompt }
    ]
  };
  
  const headers = {
    'Content-Type': 'application/json'
  };
  
  try {
    console.log('Sending request to Claude API...');
    const res = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    
    if (!res.ok) {
      console.error('API response not OK:', res.status);
      const errorText = await res.text();
      console.error('Error text:', errorText);
      throw new Error(`API error: ${res.status}`);
    }
    
    const data = await res.json();
    console.log('Response received:', data);
    
    // Extract the text content from the API response
    if (data?.content?.[0]?.text) {
      return data.content[0].text;
    } else if (data?.error?.message) {
      console.error('API error message:', data.error.message);
      return `${activeAgent.toUpperCase()}: error – ${data.error.message}`;
    } else {
      console.error('Unexpected response format:', data);
      return `${activeAgent.toUpperCase()}: no reply from HQ. something went wrong.`;
    }
  } catch (err) {
    console.error('Error in callClaude:', err);
    return `${activeAgent.toUpperCase()}: failed to connect to HQ. (${err.message})`;
  }
}

// Remove ASCII art from responses
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

// Simple markdown to HTML converter
function markdownToHtml(text) {
  // Convert code blocks
  text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  
  // Convert inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Convert headers
  text = text.replace(/### (.*)/g, '<h3>$1</h3>');
  text = text.replace(/## (.*)/g, '<h2>$1</h2>');
  text = text.replace(/# (.*)/g, '<h1>$1</h1>');
  
  // Convert lists
  text = text.replace(/^\s*- (.*)/gm, '<li>$1</li>');
  text = text.replace(/(<li>.*<\/li>\n)+/g, '<ul>$&</ul>');
  
  // Convert bold and italic
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Convert line breaks
  text = text.replace(/\n/g, '<br>');
  
  return text;
}

// Handle commands that start with /
function handleCommand(command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  appendMessage(`> ${command}`);
  
  switch (cmd) {
    case '/help':
      showHelp();
      break;
      
    case '/claude':
      if (args.trim()) {
        activeAgent = 'carnage';
        sendMessage(args.trim());
      } else {
        appendMessage('SYSTEM: Please provide a message for CARNAGE');
      }
      break;
      
    case '/venom':
      if (args.trim()) {
        activeAgent = 'venom';
        sendMessage(args.trim());
        activeAgent = 'carnage'; // Reset to default
      } else {
        appendMessage('SYSTEM: Please provide a message for VENOM');
      }
      break;
      
    // Multiplayer commands will be handled here later
    default:
      appendMessage(`SYSTEM: Unknown command: ${cmd}. Type /help for available commands.`);
  }
}

// Show help message
function showHelp() {
  const helpMessage = `
CARNAGE TERMINAL COMMANDS:

/help - Show this help message
/claude [message] - Ask CARNAGE a question
/venom [message] - Ask VENOM a question

Multiplayer features coming soon!
  `;
  
  appendMessage(`SYSTEM: ${helpMessage}`);
}

// Setup multiplayer (placeholder for now)
function setupMultiplayer() {
  // This will be expanded when multiplayer is implemented
  console.log('Multiplayer functionality will be available soon');
}
