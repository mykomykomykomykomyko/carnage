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

// Simple test to check API connection
async function testApiConnection() {
  const thinking = showThinking();
  
  try {
    console.log('Testing API connection...');
    
    // Make a simple fetch request to check if the API is accessible
    const response = await fetch('/api/test', {
      method: 'GET'
    });
    
    thinking.clear();
    console.log('Test response status:', response.status);
    
    // For debugging, log the response headers
    console.log('Response headers:', [...response.headers.entries()]);
    
    // Create a response clone before reading the body
    const responseClone = response.clone();
    
    if (response.ok) {
      try {
        const data = await responseClone.json();
        console.log('Test response data:', data);
        addMessage(`SYSTEM: API connection test successful! The API is working properly.`);
        
        // Check if API key is configured
        if (data.apiKey) {
          addMessage(`SYSTEM: ${data.apiKey}`);
        }
      } catch (jsonError) {
        console.error('Error parsing JSON:', jsonError);
        
        // If JSON parsing fails, get the text
        const textContent = await response.text();
        console.log('Test response text:', textContent.substring(0, 200));
        addMessage(`SYSTEM: API returned non-JSON response: ${textContent.substring(0, 100)}...`);
      }
    } else {
      // Try to get error information
      try {
        const errorData = await responseClone.json();
        console.error('Error data:', errorData);
        addMessage(`SYSTEM: API connection test failed: ${JSON.stringify(errorData)}`);
      } catch (jsonError) {
        console.error('Error parsing error JSON:', jsonError);
        
        // If we can't parse JSON, get text content
        const textContent = await response.text();
        console.log('Error response text:', textContent.substring(0, 200));
        addMessage(`SYSTEM: API test failed with status ${response.status}. Response: ${textContent.substring(0, 100)}...`);
      }
    }
  } catch (error) {
    console.error('Test error:', error);
    thinking.clear();
    addMessage(`SYSTEM: API connection error: ${error.message}`);
  }
}

// Ask Claude API with simulated response for now
async function askClaude(question) {
  const thinking = showThinking();
  
  try {
    console.log('Preparing fake Claude API response...');
    
    // Set timeout to simulate network delay
    setTimeout(() => {
      thinking.clear();
      
      // Create fake responses for now
      const fakeResponses = {
        carnage: "### Command executed\n\nTask analyzed and completed with maximum efficiency.\n\n- Input processed\n- Solution generated\n- Output delivered\n\nFurther instructions?",
        venom: "Analysis complete.\n\nYour request has been processed with precision. Key findings:\n\n1. Parameters assessed\n2. Strategic approach identified\n3. Tactical solution formulated\n\nHow would you like to proceed?"
      };
      
      const agentLabel = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
      const response = agentLabel + ': ' + fakeResponses[activeAgent];
      
      // Show fake response - we'll implement real API calls later
      addMessage(response, activeAgent);
      
      addMessage("SYSTEM: Note: This is a simulated response. Real Claude API integration coming soon.", "system");
    }, 1000);
    
  } catch (error) {
    // Clear thinking indicator and show error
    thinking.clear();
    console.error('Error in askClaude:', error);
    addMessage(`ERROR: ${error.message || 'Failed to connect to HQ'}`);
  }
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
