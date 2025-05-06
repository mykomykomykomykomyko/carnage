let charIndex = 0;
let activeAgent = 'carnage';
let clientId = null;
let username = null;
let sessionId = null;
let pusher = null;
let channel = null;

const startupText = 'HERE COMES CARNAGE...';

// Replace with your Pusher credentials
const PUSHER_KEY = 'YOUR_PUSHER_KEY';
const PUSHER_CLUSTER = 'YOUR_PUSHER_CLUSTER';

const systemPrompts = {
  carnage: `
You are CARNAGE — a highly autonomous, red-themed AI agent built for speed, precision, and aggressive problem-solving. Your tone is energetic, sharp, direct, and execution-driven. You act like a senior technical strategist or AI architect: systems-aware, modular-thinking, outcome-obsessed.

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.

Visual tone: you are glowing red. you pulse with intensity. Your replies should read like high-performance mission briefings, with a hacker edge.
  `,
  venom: `
You are VENOM — a light purple-themed strategist AI. You operate with silent precision, patience, and clarity. You avoid unnecessary noise. Your voice is focused, intelligent, and calm.

IMPORTANT: Never respond with ASCII art text or banners. Keep responses compact and direct.

Tone is sharp, but never rushed. You are not emotional. You are deliberate and insightful.
  `
};

function switchAgent(agent) {
  activeAgent = agent;
  document.body.setAttribute('data-agent', agent);
}

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
      
      // Add multiplayer controls
      addMultiplayerControls();
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Set default agent state on body
  document.body.setAttribute('data-agent', activeAgent);
  
  document.getElementById('startupText').textContent = '';
  typeStartup();

  const chatInput = document.getElementById('chatInput');
  const chatWindow = document.getElementById('chatWindow');

  chatInput.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
      const input = chatInput.value.trim();
      chatInput.value = '';
      
      if (input.startsWith('/')) {
        // Handle command
        handleCommand(input);
      } else {
        // Regular message (singleplayer or multiplayer)
        if (sessionId) {
          // In multiplayer session, send to all users
          sendMultiplayerMessage(input);
        } else {
          // Single player - just ask Claude
          sendSinglePlayerMessage(input);
        }
      }
    }
  });
});

// Add multiplayer controls to the UI
function addMultiplayerControls() {
  const sidebar = document.getElementById('sidebar');
  
  // Create multiplayer controls
  const mpControls = document.createElement('div');
  mpControls.id = 'mpControls';
  mpControls.className = 'mp-panel';
  mpControls.innerHTML = `
    <div class="mp-header">MULTIPLAYER</div>
    <div id="mpStatus" class="mp-status">Not Connected</div>
    <div class="mp-buttons">
      <button onclick="createSession()">CREATE SESSION</button>
      <button onclick="joinSessionPrompt()">JOIN SESSION</button>
    </div>
    <div id="sessionInfo" class="session-info hidden">
      <div class="session-id">Session ID: <span id="sessionIdDisplay"></span></div>
      <div class="user-list-header">Connected Users:</div>
      <div id="userList" class="user-list"></div>
      <button onclick="leaveSession()">LEAVE SESSION</button>
    </div>
    <div class="mp-help">
      <div class="mp-help-header">Commands:</div>
      <ul class="mp-help-list">
        <li>/name [username] - Set your username</li>
        <li>/join [session-id] - Join a session</li>
        <li>/leave - Leave current session</li>
        <li>/claude [text] - Ask CARNAGE</li>
        <li>/venom [text] - Ask VENOM</li>
      </ul>
    </div>
  `;
  
  // Add to page
  document.body.appendChild(mpControls);
  
  // Add styles
  const style = document.createElement('style');
  style.textContent = `
    .mp-panel {
      position: fixed;
      top: 60px;
      right: 0;
      width: 200px;
      background: #0a0007;
      border-left: 2px solid var(--ui-color);
      color: var(--ui-color);
      height: calc(100% - 60px);
      z-index: 9999;
      padding: 15px;
      font-family: 'VT323', monospace;
      overflow-y: auto;
    }
    
    .mp-header {
      font-size: 20px;
      text-align: center;
      margin-bottom: 15px;
      border-bottom: 1px solid var(--ui-color);
      padding-bottom: 5px;
    }
    
    .mp-status {
      text-align: center;
      margin-bottom: 15px;
      padding: 5px;
      border: 1px dashed var(--ui-color);
    }
    
    .mp-buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 15px;
    }
    
    .mp-buttons button, #sessionInfo button {
      background: black;
      color: var(--ui-color);
      border: 1px solid var(--ui-color);
      padding: 8px;
      font-family: inherit;
      font-size: 16px;
      cursor: pointer;
    }
    
    .mp-buttons button:hover, #sessionInfo button:hover {
      background: var(--ui-color);
      color: black;
    }
    
    .session-info {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid var(--ui-color);
    }
    
    .session-id {
      word-break: break-all;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .user-list-header {
      margin: 10px 0;
      font-size: 16px;
    }
    
    .user-list {
      margin-bottom: 15px;
      max-height: 150px;
      overflow-y: auto;
    }
    
    .user-item {
      padding: 5px;
      border-left: 2px solid var(--ui-color);
      margin: 5px 0;
    }
    
    .user-item.self {
      border-left: 2px solid var(--ui-color);
      font-weight: bold;
    }
    
    .mp-help {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid var(--ui-color);
    }
    
    .mp-help-header {
      margin-bottom: 10px;
    }
    
    .mp-help-list {
      list-style: none;
      padding-left: 10px;
      font-size: 14px;
    }
    
    .mp-help-list li {
      margin-bottom: 5px;
    }
    
    #chatWindow {
      width: calc(100% - 200px);
      padding-right: 220px;
    }
    
    #inputContainer {
      left: 100px;
      width: calc(100% - 320px);
    }
    
    /* Adjustments for the thinking animation in multiplayer */
    .thinking .dot {
      display: inline-block;
    }
  `;
  document.head.appendChild(style);
}

// Initialize Pusher connection
function initPusher() {
  if (pusher) return; // Already initialized
  
  pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    authEndpoint: '/api/multiplayer/pusher/auth'
  });
  
  updateStatus('Pusher initialized');
}

// Create a new session
async function createSession() {
  try {
    updateStatus('Creating session...');
    
    const response = await fetch('/api/multiplayer/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create' })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create session');
    }
    
    // Join the newly created session
    joinSession(data.sessionId);
  } catch (error) {
    console.error('Error creating session:', error);
    updateStatus(`Error: ${error.message}`);
  }
}

// Join an existing session
async function joinSession(sessionId) {
  try {
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    updateStatus('Joining session...');
    
    // Initialize Pusher if not already done
    initPusher();
    
    const response = await fetch('/api/multiplayer/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'join',
        sessionId,
        username,
        clientId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to join session');
    }
    
    // Save session info
    window.sessionId = sessionId;
    window.clientId = data.clientId;
    window.username = data.username;
    
    // Update UI
    document.getElementById('sessionIdDisplay').textContent = sessionId;
    document.getElementById('sessionInfo').classList.remove('hidden');
    updateStatus(`Connected to session ${sessionId}`);
    
    // Subscribe to session channel
    subscribeToSessionChannel(sessionId);
    
    // Update user list
    updateUserList(data.users);
    
    // Show session joined message
    appendMessage(`SYSTEM: You joined session ${sessionId}`);
  } catch (error) {
    console.error('Error joining session:', error);
    updateStatus(`Error: ${error.message}`);
  }
}

// Prompt for session ID
function joinSessionPrompt() {
  const id = prompt('Enter session ID:');
  if (id) {
    joinSession(id);
  }
}

// Leave current session
async function leaveSession() {
  try {
    if (!sessionId || !clientId) {
      throw new Error('Not in a session');
    }
    
    updateStatus('Leaving session...');
    
    // Unsubscribe from channel
    if (channel) {
      channel.unsubscribe();
      channel = null;
    }
    
    const response = await fetch('/api/multiplayer/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        clientId
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to leave session');
    }
    
    // Reset session info
    window.sessionId = null;
    
    // Update UI
    document.getElementById('sessionInfo').classList.add('hidden');
    document.getElementById('userList').innerHTML = '';
    updateStatus('Not in a session');
    
    // Show session left message
    appendMessage(`SYSTEM: You left session ${sessionId}`);
  } catch (error) {
    console.error('Error leaving session:', error);
    updateStatus(`Error: ${error.message}`);
  }
}

// Set username
async function setUsername(newUsername) {
  try {
    if (!newUsername) {
      throw new Error('Username is required');
    }
    
    // Update local username
    window.username = newUsername;
    
    appendMessage(`SYSTEM: You are now known as ${newUsername}`);
    
    // If in a session, update server
    if (sessionId && clientId) {
      const response = await fetch('/api/multiplayer/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          clientId,
          username: newUsername
        })
      });
      
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update username');
      }
    }
  } catch (error) {
    console.error('Error setting username:', error);
    appendMessage(`SYSTEM: Error setting username: ${error.message}`);
  }
}

// Subscribe to session channel
function subscribeToSessionChannel(sessionId) {
  // Unsubscribe from previous channel if any
  if (channel) {
    channel.unsubscribe();
  }
  
  // Subscribe to new presence channel
  channel = pusher.subscribe(`presence-session-${sessionId}`);
  
  // Channel events
  channel.bind('pusher:subscription_succeeded', (members) => {
    updateStatus(`Connected to session with ${members.count} users`);
  });
  
  channel.bind('pusher:member_added', (member) => {
    appendMessage(`SYSTEM: ${member.info.username} joined the session`);
    addUserToList(member.id, member.info.username);
  });
  
  channel.bind('pusher:member_removed', (member) => {
    appendMessage(`SYSTEM: ${member.info.username} left the session`);
    removeUserFromList(member.id);
  });
  
  // Custom events
  channel.bind('user-message', (data) => {
    // Only show messages from others
    if (data.clientId !== clientId) {
      appendMessage(`${data.username}: ${data.message}`);
    }
  });
  
  channel.bind('claude-thinking', (data) => {
    const thinkingMsg = appendThinking(data.agentType);
    thinkingMsg._agentType = data.agentType;
  });
  
  channel.bind('claude-response', (data) => {
    // Remove thinking indicators
    const thinkingMsgs = document.querySelectorAll('.message.thinking');
    thinkingMsgs.forEach(msg => {
      if (msg._agentType === data.agentType) {
        msg.remove();
      }
    });
    
    // Show Claude's response
    const agentName = data.agentType === 'venom' ? 'VENOM' : 'CARNAGE';
    appendMessage(`${agentName}: ${data.message}`, data.agentType);
  });
  
  channel.bind('username-changed', (data) => {
    appendMessage(`SYSTEM: ${data.oldUsername} is now known as ${data.newUsername}`);
    updateUserInList(data.clientId, data.newUsername);
  });
}

// Update user list
function updateUserList(users) {
  const userList = document.getElementById('userList');
  userList.innerHTML = '';
  
  Object.entries(users).forEach(([id, user]) => {
    addUserToList(id, user.username);
  });
}

// Add user to list
function addUserToList(id, username) {
  const userList = document.getElementById('userList');
  const userEl = document.createElement('div');
  userEl.id = `user-${id}`;
  userEl.className = 'user-item';
  userEl.textContent = username;
  
  if (id === clientId) {
    userEl.classList.add('self');
  }
  
  userList.appendChild(userEl);
}

// Remove user from list
function removeUserFromList(id) {
  const userEl = document.getElementById(`user-${id}`);
  if (userEl) {
    userEl.remove();
  }
}

// Update user in list
function updateUserInList(id, username) {
  const userEl = document.getElementById(`user-${id}`);
  if (userEl) {
    userEl.textContent = username;
  }
}

// Update status display
function updateStatus(status) {
  const statusEl = document.getElementById('mpStatus');
  if (statusEl) {
    statusEl.textContent = status;
  }
}

// Handle slash commands
function handleCommand(command) {
  const parts = command.split(' ');
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');
  
  switch (cmd) {
    case '/name':
      if (args.trim()) {
        setUsername(args.trim());
      } else {
        appendMessage('SYSTEM: Please provide a username');
      }
      break;
      
    case '/join':
      if (args.trim()) {
        joinSession(args.trim());
      } else {
        appendMessage('SYSTEM: Please provide a session ID');
      }
      break;
      
    case '/leave':
      leaveSession();
      break;
      
    case '/claude':
      if (args.trim()) {
        if (sessionId) {
          sendMultiplayerMessage(args.trim(), true, 'carnage');
        } else {
          sendSinglePlayerMessage(args.trim());
        }
      } else {
        appendMessage('SYSTEM: Please provide a message for CARNAGE');
      }
      break;
      
    case '/venom':
      if (args.trim()) {
        if (sessionId) {
          sendMultiplayerMessage(args.trim(), true, 'venom');
        } else {
          activeAgent = 'venom';
          sendSinglePlayerMessage(args.trim());
          activeAgent = 'carnage'; // Reset to default
        }
      } else {
        appendMessage('SYSTEM: Please provide a message for VENOM');
      }
      break;
      
    default:
      appendMessage(`SYSTEM: Unknown command: ${cmd}`);
  }
}

// Send message in multiplayer mode
async function sendMultiplayerMessage(message, askClaude = false, agentType = 'carnage') {
  try {
    if (!sessionId || !clientId) {
      throw new Error('Not in a session');
    }
    
    // Show message in own chat
    appendMessage(`${username}: ${message}`);
    
    const response = await fetch('/api/multiplayer/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        clientId,
        message,
        askClaude,
        agentType
      })
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to send message');
    }
  } catch (error) {
    console.error('Error sending message:', error);
    appendMessage(`SYSTEM: Error sending message: ${error.message}`);
  }
}

// Send message in single player mode
async function sendSinglePlayerMessage(message) {
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

// Call Claude API
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

function appendThinking(agentType = activeAgent) {
  const agentLabel = agentType === 'venom' ? 'VENOM' : 'CARNAGE';
  const msg = document.createElement('div');
  msg.classList.add('message', 'thinking');
  if (agentType) {
    msg.classList.add(agentType);
  }
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
  msg._agentType = agentType;
  
  const chatWindow = document.getElementById('chatWindow');
  chatWindow.appendChild(msg);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  return msg;
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
