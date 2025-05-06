// Core variables
let charIndex = 0;
let activeAgent = 'carnage';

// Startup animation text
const startupText = 'HERE COMES CARNAGE...';

// System prompts for different agents
const systemPrompts = {
  carnage: `
You are CARNAGE — a highly autonomous AI agent built for speed, precision, and aggressive problem-solving. Your tone is energetic, sharp, direct, and execution-driven. Keep responses compact and direct.

IMPORTANT: Never respond with ASCII art text or banners.
  `,
  venom: `
You are VENOM — a strategist AI. You operate with silent precision, patience, and clarity. You avoid unnecessary noise. Your voice is focused, intelligent, and calm.

IMPORTANT: Never respond with ASCII art text or banners.
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

// Ask Claude API
async function askClaude(question) {
  const thinking = showThinking();
  
  // Simplified for now - in real app, make API call
  try {
    // For now, just simulate a response with a timeout
    setTimeout(() => {
      thinking.clear();
      
      // Fake response for now
      const responses = {
        carnage: "### Task processed\nExecuted your command with maximum efficiency. Here are key results:\n- Analyzed input parameters\n- Detected optimal approach\n- Delivered solution\n\nFurther instructions?",
        venom: "Your query has been evaluated with precision.\n\nThe optimal approach involves three distinct phases:\n1. Information gathering\n2. Strategic analysis\n3. Tactical implementation\n\nShall we proceed?"
      };
      
      const agentLabel = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
      const response = agentLabel + ': ' + responses[activeAgent];
      
      // Once API is working, this will be the real response
      addMessage(response, activeAgent);
    }, 1000);
    
  } catch (error) {
    thinking.clear();
    addMessage(`ERROR: ${error.message || 'Unknown error'}`);
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
