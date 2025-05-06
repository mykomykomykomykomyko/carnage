// Core variables
let charIndex = 0;
let activeAgent = 'carnage';

// Startup animation text
const startupText = 'HERE COMES CARNAGE...';

// System prompts for different agents
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

Tone is sharp, but never rushed. You are not emotional. You are deliberate and insightful.
  `
};

// Initialize when page loads
window.onload = function() {
  console.log("CARNAGE terminal initializing");
  document.getElementById('startupText').textContent = '';
  typeStartup();
  
  // Set up input handler
  document.getElementById('input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && this.value.trim()) {
      handleCommand(this.value.trim());
      this.value = '';
    }
  });
};

// Type startup text one character at a time
function typeStartup() {
  const el = document.getElementById('startupText');
  if (charIndex < startupText.length) {
    el.textContent += startupText[charIndex];
    charIndex++;
    setTimeout(typeStartup, 100);
  } else {
    // Show chat screen after typing finishes
    setTimeout(() => {
      document.getElementById('startup').classList.add('hidden');
      document.getElementById('chat').classList.remove('hidden');
      document.getElementById('input').focus();
    }, 1500);
  }
}

// Handle user commands
function handleCommand(command) {
  addMessage(`> ${command}`, 'user');
  
  if (command.startsWith('/')) {
    // Handle special commands
    const parts = command.split(' ');
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1).join(' ');
    
    switch (cmd) {
      case '/help':
        showHelp();
        break;
      case '/venom':
        if (args) {
          activeAgent = 'venom';
          document.body.setAttribute('data-agent', 'venom');
          askClaude(args);
          activeAgent = 'carnage';
          document.body.setAttribute('data-agent', 'carnage');
        } else {
          addMessage("SYSTEM: Please provide a message for VENOM");
        }
        break;
      case '/claude':
        if (args) {
          askClaude(args);
        } else {
          addMessage("SYSTEM: Please provide a message for CARNAGE");
        }
        break;
      case '/test':
        // Simple test to check if the API connection works
        testApiConnection();
        break;
      case '/api':
        // Check if the base API is working
        checkBaseApi();
        break;
      default:
        addMessage(`SYSTEM: Unknown command: ${cmd}`);
    }
  } else {
    // Treat as a question for Claude
    askClaude(command);
  }
}

// Show help information
function showHelp() {
  const helpText = `
AVAILABLE COMMANDS:

/help - Show this help message
/claude [message] - Ask CARNAGE specifically
/venom [message] - Ask VENOM instead
/test - Test API connection
/api - Check base API endpoint

You can also type any message directly to ask CARNAGE.
  `;
  
  addMessage("SYSTEM: " + helpText);
}

// Add a message to the output
function addMessage(text, from = 'system') {
  const output = document.getElementById('output');
  const msg = document.createElement('div');
  msg.className = 'message';
  
  if (from === 'carnage' || from === 'venom') {
    msg.classList.add(from);
  }
  
  // Convert markdown if needed
  if (from === 'carnage' || from === 'venom') {
    msg.innerHTML = markdownToHtml(text);
  } else {
    msg.textContent = text;
  }
  
  output.appendChild(msg);
  output.scrollTop = output.scrollHeight;
  return msg;
}

// Add thinking indicator
function showThinking() {
  const agentLabel = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
  const msg = addMessage(`${agentLabel} IS THINKING`, activeAgent);
  msg.classList.add('thinking');
  
  // Add blinking dots
  const dot = document.createElement('span');
  dot.className = 'dot';
  msg.appendChild(dot);
  
  let dots = 0;
  const interval = setInterval(() => {
    dots = (dots + 1) % 4;
    dot.textContent = '.'.repeat(dots);
  }, 500);
  
  return {
    element: msg,
    clear: () => {
      clearInterval(interval);
      msg.remove();
    }
  };
}

// Check base API endpoint
async function checkBaseApi() {
  const thinking = showThinking();
  
  try {
    console.log('Checking base API...');
    const response = await fetch('/api');
    
    thinking.clear();
    
    if (response.ok) {
      try {
        const data = await response.json();
        addMessage(`SYSTEM: Base API is working! Response: ${JSON.stringify(data)}`);
      } catch (error) {
        const text = await response.text();
        addMessage(`SYSTEM: Base API returned non-JSON: ${text.substring(0, 100)}...`);
      }
    } else {
      addMessage(`SYSTEM: Base API returned error ${response.status}`);
    }
  } catch (error) {
    thinking.clear();
    addMessage(`SYSTEM: Error checking base API: ${error.message}`);
  }
}

// Simple test to check API connection
async function testApiConnection() {
  const thinking = showThinking();
  
  try {
    console.log('Testing API connection...');
    const response = await fetch('/api/test');
    
    thinking.clear();
    
    if (response.ok) {
      try {
        const data = await response.json();
        addMessage(`SYSTEM: API test successful! The test endpoint is working.`);
        
        // Check if API key is configured
        if (data.apiKey) {
          addMessage(`SYSTEM: ${data.apiKey}`);
        }
      } catch (error) {
        const text = await response.text();
        addMessage(`SYSTEM: API returned non-JSON: ${text.substring(0, 100)}...`);
      }
    } else {
      addMessage(`SYSTEM: API test failed with status ${response.status}`);
      try {
        const text = await response.text();
        addMessage(`SYSTEM: Error details: ${text.substring(0, 100)}...`);
      } catch (error) {
        addMessage(`SYSTEM: Could not get error details: ${error.message}`);
      }
    }
  } catch (error) {
    thinking.clear();
    addMessage(`SYSTEM: API connection error: ${error.message}`);
  }
}

// Ask Claude API - now using the real API!
async function askClaude(question) {
  const thinking = showThinking();
  
  try {
    console.log('Sending request to Claude API...');
    
    // Prepare request to our API endpoint
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system: systemPrompts[activeAgent],
        messages: [
          { role: 'user', content: question }
        ]
      })
    });
    
    // Check for non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textContent = await response.text();
      thinking.clear();
      console.error('Non-JSON response:', textContent.substring(0, 200));
      addMessage(`SYSTEM: API returned non-JSON response. Please check server logs.`);
      return;
    }
    
    // Parse the response
    const data = await response.json();
    
    // Check for error response
    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }
    
    console.log('Response received from Claude API');
    
    // Remove thinking indicator
    thinking.clear();
    
    // Extract Claude's response
    if (data?.content?.[0]?.text) {
      const agentLabel = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
      const responseText = agentLabel + ': ' + data.content[0].text;
      
      // Show the response
      addMessage(responseText, activeAgent);
    } else {
      throw new Error('Unexpected response format from API');
    }
    
  } catch (error) {
    // Clear thinking indicator and show error
    thinking.clear();
    console.error('Error in askClaude:', error);
    addMessage(`SYSTEM: API error: ${error.message || 'Unknown error'}`);
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

// Convert markdown to HTML
function markdownToHtml(text) {
  // Very simple markdown conversion
  let html = text
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    // Lists
    .replace(/^\s*- (.*)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>');
    
  return html;
}

// Function to switch between agents (Carnage/Venom)
function switchAgent(agent) {
  activeAgent = agent;
  document.body.setAttribute('data-agent', agent);
}
