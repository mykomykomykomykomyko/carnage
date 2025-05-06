// Core variables
let charIndex = 0;
let activeAgent = 'carnage';

// Multiplayer variables
let clientId = null;
let username = null;
let sessionId = null;
let sessionUsers = {};
let pollingInterval = null; // For session updates
let lastUserMessage = ''; // Track last message to prevent duplicates
let isConnecting = false; // Flag to prevent multiple concurrent connection attempts
let customSessionIdInput = null; // Cache DOM reference

// Startup animation text
const startupText = 'LET THERE BE CARNAGE...';

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

// Rate limiting for API calls
const apiRateLimits = {
  lastCalls: {},
  minDelay: 1000 // Minimum 1 second between calls to the same endpoint
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
      document.getElementById('chatInput').focus();
      
      // Add multiplayer controls after startup
      setupMultiplayerUI();
      
      // Set default username based on timestamp to ensure uniqueness
      setDefaultUsername();
    }, 1500);
  }
}

// Set a default username on startup
function setDefaultUsername() {
  // Use timestamp and random number to ensure uniqueness
  const timestamp = new Date().getTime().toString().slice(-4);
  const random = Math.floor(Math.random() * 1000);
  username = `user-${timestamp}${random}`;
  
  // Log the auto-generated username
  console.log('Auto-generated username:', username);
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log("CARNAGE terminal initializing");
  document.body.setAttribute('data-agent', activeAgent);
  
  try {
    // Check if any previous session data exists in localStorage
    checkForExistingSession();
    
    // Start animation
    document.getElementById('startupText').textContent = '';
    typeStartup();

    // Set up input handler with improved event handling
    setupInputHandlers();
    
    // Handle window beforeunload to cleanup resources
    window.addEventListener('beforeunload', cleanupBeforeUnload);
  } catch (error) {
    console.error('Error during initialization:', error);
    // Try to recover by showing the chat interface
    document.getElementById('startup').classList.add('hidden');
    document.getElementById('chat').classList.remove('hidden');
    addMessage('SYSTEM: Error during initialization. Some features may be limited.', 'system');
  }
});

// Check for existing session in localStorage
function checkForExistingSession() {
  try {
    const savedSession = localStorage.getItem('carnageSession');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      if (sessionData.sessionId && sessionData.username) {
        console.log('Found saved session:', sessionData);
        
        // Give option to rejoin previous session
        setTimeout(() => {
          if (confirm(`Rejoin previous session ${sessionData.sessionId} as ${sessionData.username}?`)) {
            username = sessionData.username;
            joinSession(sessionData.sessionId);
          } else {
            // Clear saved session if not rejoining
            localStorage.removeItem('carnageSession');
          }
        }, 2000); // Wait a bit after startup animation
      }
    }
  } catch (error) {
    console.error('Error checking for existing session:', error);
    localStorage.removeItem('carnageSession');
  }
}

// Save current session to localStorage
function saveSessionToLocalStorage() {
  if (sessionId && username) {
    try {
      localStorage.setItem('carnageSession', JSON.stringify({
        sessionId,
        username,
        timestamp: new Date().getTime()
      }));
    } catch (error) {
      console.error('Error saving session to localStorage:', error);
    }
  }
}

// Clean up resources before page unload
function cleanupBeforeUnload() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // Save session data if in a session
  if (sessionId) {
    saveSessionToLocalStorage();
  }
}

// Set up input handlers
function setupInputHandlers() {
  const chatInput = document.getElementById('chatInput');
  
  // Handle Enter key specifically with both keydown and keypress events
  chatInput.addEventListener('keydown', function(e) {
    // Check for Enter key (both key name and keyCode for wider compatibility)
    if ((e.key === 'Enter' || e.keyCode === 13) && this.value.trim()) {
      e.preventDefault(); // Prevent default to ensure consistent behavior
      console.log('Enter detected, processing command:', this.value.trim());
      
      const command = this.value.trim();
      
      // Check for duplicate message
      if (command === lastUserMessage) {
        console.log('Duplicate message detected. Not sending again.');
        addMessage('SYSTEM: Duplicate message detected. Not sending again.', 'system');
      } else {
        handleCommand(command);
        lastUserMessage = command; // Update last message
      }
      
      this.value = '';
    }
  });
  
  // Make clicking ENTER text also submit
  document.getElementById('enterHint').addEventListener('click', function() {
    const inputValue = chatInput.value.trim();
    if (inputValue) {
      console.log('ENTER clicked, processing command:', inputValue);
      
      // Check for duplicate message
      if (inputValue === lastUserMessage) {
        console.log('Duplicate message detected. Not sending again.');
        addMessage('SYSTEM: Duplicate message detected. Not sending again.', 'system');
      } else {
        handleCommand(inputValue);
        lastUserMessage = inputValue; // Update last message
      }
      
      chatInput.value = '';
      chatInput.focus(); // Return focus to input after clicking
    }
  });
}

// Function to set up multiplayer UI
function setupMultiplayerUI() {
  // Create multiplayer controls container
  const mpControls = document.createElement('div');
  mpControls.id = 'mpControls';
  mpControls.className = 'mp-controls';
  mpControls.innerHTML = `
    <div class="mp-header">MULTIPLAYER</div>
    <div id="mpStatus" class="mp-status">Not Connected</div>
    <div class="mp-buttons">
      <button id="createSessionBtn">CREATE SESSION</button>
      <button id="joinSessionBtn">JOIN SESSION</button>
    </div>
    <div id="customSessionSection">
      <input type="text" id="customSessionId" placeholder="Custom session ID" />
      <button id="createCustomSessionBtn">CREATE CUSTOM</button>
    </div>
    <div id="sessionInfo" class="session-info hidden">
      <div class="session-id">Session ID: <span id="sessionIdDisplay"></span></div>
      <div class="user-list-header">Connected Users:</div>
      <div id="userList" class="user-list"></div>
      <button id="leaveSessionBtn">LEAVE SESSION</button>
    </div>
  `;
  
  // Add to the document
  document.body.appendChild(mpControls);
  
  // Add CSS for multiplayer controls
  addMultiplayerStyles();
  
  // Set up event listeners for multiplayer buttons
  document.getElementById('createSessionBtn').addEventListener('click', createSession);
  document.getElementById('joinSessionBtn').addEventListener('click', joinSessionPrompt);
  document.getElementById('leaveSessionBtn').addEventListener('click', leaveSession);
  document.getElementById('createCustomSessionBtn').addEventListener('click', createCustomSession);
  
  // Cache DOM references
  customSessionIdInput = document.getElementById('customSessionId');
  
  // Update status
  updateStatus('Ready to connect');
}

// Add CSS styles for multiplayer UI
function addMultiplayerStyles() {
  const style = document.createElement('style');
  style.textContent = `
    .mp-controls {
      position: fixed;
      top: 60px;
      right: 0;
      width: 180px;
      height: calc(100% - 60px);
      background: #0a0007;
      border-left: 2px solid var(--ui-color);
      color: var(--ui-color);
      padding: 15px;
      z-index: 9999;
      font-family: 'VT323', monospace;
      overflow-y: auto;
    }
    
    .mp-header {
      text-align: center;
      font-size: 20px;
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
    
    #customSessionSection {
      margin: 15px 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    
    #customSessionId {
      background: black;
      color: var(--ui-color);
      border: 1px solid var(--ui-color);
      padding: 5px;
      font-family: inherit;
      outline: none;
    }
    
    .mp-buttons button, #sessionInfo button, #createCustomSessionBtn {
      background: black;
      color: var(--ui-color);
      border: 1px solid var(--ui-color);
      padding: 8px;
      font-family: inherit;
      font-size: 16px;
      cursor: pointer;
      transition: background-color 0.2s, color 0.2s;
    }
    
    .mp-buttons button:hover, #sessionInfo button:hover, #createCustomSessionBtn:hover {
      background: var(--ui-color);
      color: black;
    }
    
    .mp-buttons button:disabled, #sessionInfo button:disabled, #createCustomSessionBtn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .session-info {
      margin-top: 15px;
      border-top: 1px solid var(--ui-color);
      padding-top: 15px;
    }
    
    .session-id {
      word-break: break-all;
      margin-bottom: 10px;
      font-size: 14px;
    }
    
    .user-list-header {
      margin: 10px 0;
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
      border-left-width: 4px;
    }

    /* Adjust chat window to make room for multiplayer panel */
    #chatWindow {
      width: calc(100% - 300px);
    }
    
    #inputContainer {
      width: calc(100% - 300px);
      left: 100px;
    }
  `;
  document.head.appendChild(style);
}

// Create custom session with user-defined ID
async function createCustomSession() {
  if (isConnecting) {
    addMessage('SYSTEM: Already connecting to a session. Please wait...', 'system');
    return;
  }
  
  const customId = customSessionIdInput.value.trim();
  if (!customId) {
    addMessage('SYSTEM: Please enter a custom session ID', 'system');
    return;
  }
  
  // Sanitize custom ID - only allow letters, numbers, and hyphens
  if (!/^[a-zA-Z0-9-]+$/.test(customId)) {
    addMessage('SYSTEM: Session ID can only contain letters, numbers, and hyphens', 'system');
    return;
  }
  
  isConnecting = true;
  updateStatus('Creating custom session...');
  
  try {
    // Disable buttons during connection
    toggleConnectionButtons(false);
    
    // First, try to directly join the session with the custom ID
    const joinResponse = await fetchWithTimeout('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'join',
        sessionId: customId,
        clientId,
        username
      })
    }, 5000); // 5 second timeout
    
    if (joinResponse.ok) {
      const data = await joinResponse.json();
      
      if (data.success) {
        handleSuccessfulJoin(data);
        return;
      }
    }
    
    // If joining failed, create a custom session locally
    console.log('Server-side session not found, creating client-side custom session...');
    
    // Set up client-side session data
    sessionId = customId;
    clientId = clientId || generateId();
    sessionUsers = {
      [clientId]: {
        username: username,
        joinedAt: new Date().toISOString()
      }
    };
    
    // Save session data to localStorage
    saveSessionToLocalStorage();
    
    // Update UI to reflect custom session
    document.getElementById('sessionIdDisplay').textContent = customId;
    document.getElementById('sessionInfo').classList.remove('hidden');
    updateStatus(`In custom session: ${customId}`);
    
    // Update user list
    updateUserList(sessionUsers);
    
    // Add message to chat
    addMessage(`SYSTEM: Created custom session ${customId}`, 'system');
    
  } catch (error) {
    console.error('Error creating custom session:', error);
    updateStatus('Error: ' + error.message);
    addMessage(`SYSTEM: Error creating custom session: ${error.message}`, 'system');
  } finally {
    isConnecting = false;
    toggleConnectionButtons(true);
  }
}

// Toggle connection buttons enabled/disabled state
function toggleConnectionButtons(enabled) {
  const buttons = [
    document.getElementById('createSessionBtn'),
    document.getElementById('joinSessionBtn'),
    document.getElementById('createCustomSessionBtn')
  ];
  
  buttons.forEach(button => {
    if (button) {
      button.disabled = !enabled;
    }
  });
}

// Fetch with timeout
async function fetchWithTimeout(resource, options = {}, timeout = 8000) {
  // Apply rate limiting
  const endpoint = resource.toString();
  const now = Date.now();
  
  if (apiRateLimits.lastCalls[endpoint]) {
    const timeSinceLastCall = now - apiRateLimits.lastCalls[endpoint];
    if (timeSinceLastCall < apiRateLimits.minDelay) {
      const waitTime = apiRateLimits.minDelay - timeSinceLastCall;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  // Update last call time
  apiRateLimits.lastCalls[endpoint] = Date.now();
  
  // Create abort controller for timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`);
    }
    throw error;
  }
}

// Generate a random ID (for clientId when needed)
function generateId() {
  return 'id-' + Math.random().toString(36).substring(2, 10);
}

// Helper function to handle successful join
function handleSuccessfulJoin(data) {
  // Save session information
  sessionId = data.sessionId;
  clientId = data.clientId;
  username = data.username;
  sessionUsers = data.users || {};
  
  // Save to localStorage
  saveSessionToLocalStorage();
  
  // Update UI
  document.getElementById('sessionIdDisplay').textContent = sessionId;
  document.getElementById('sessionInfo').classList.remove('hidden');
  updateStatus(`In session: ${sessionId}`);
  
  // Add message to chat
  addMessage(`SYSTEM: You joined session ${sessionId}`, 'system');
  
  // Update user list
  updateUserList(sessionUsers);
  
  // Start polling for session updates
  startPolling();
}

// Create a new session
async function createSession() {
  if (isConnecting) {
    addMessage('SYSTEM: Already connecting to a session. Please wait...', 'system');
    return;
  }
  
  isConnecting = true;
  updateStatus('Creating session...');
  toggleConnectionButtons(false);
  
  try {
    // Request to create a new session
    const response = await fetchWithTimeout('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'create'
      })
    });
    
    if (!response.ok) {
      // If server fails, create a local session with a random ID
      if (response.status >= 500) {
        console.log('Server error when creating session, falling back to local session');
        createLocalSession();
        return;
      }
      
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to create session');
    }
    
    // Join the newly created session
    joinSession(data.sessionId);
  } catch (error) {
    console.error('Error creating session:', error);
    updateStatus('Error: ' + error.message);
    addMessage(`SYSTEM: Error creating session: ${error.message}`, 'system');
    
    // Create local session as fallback
    createLocalSession();
  } finally {
    isConnecting = false;
    toggleConnectionButtons(true);
  }
}

// Create a local session with random ID when server fails
function createLocalSession() {
  const localSessionId = 'local-' + Math.random().toString(36).substring(2, 10);
  console.log('Creating local session:', localSessionId);
  
  // Set up client-side session data
  sessionId = localSessionId;
  clientId = clientId || generateId();
  sessionUsers = {
    [clientId]: {
      username: username,
      joinedAt: new Date().toISOString()
    }
  };
  
  // Save to localStorage
  saveSessionToLocalStorage();
  
  // Update UI
  document.getElementById('sessionIdDisplay').textContent = localSessionId;
  document.getElementById('sessionInfo').classList.remove('hidden');
  updateStatus(`In local session: ${localSessionId}`);
  
  // Update user list
  updateUserList(sessionUsers);
  
  // Add message to chat
  addMessage(`SYSTEM: Created local session ${localSessionId}`, 'system');
}

// Join a session prompt
function joinSessionPrompt() {
  if (isConnecting) {
    addMessage('SYSTEM: Already connecting to a session. Please wait...', 'system');
    return;
  }
  
  const id = prompt('Enter session ID:');
  if (id) {
    if (!/^[a-zA-Z0-9-]+$/.test(id)) {
      addMessage('SYSTEM: Session ID can only contain letters, numbers, and hyphens', 'system');
      return;
    }
    joinSession(id);
  }
}

// Join a session
async function joinSession(id) {
  if (isConnecting) {
    addMessage('SYSTEM: Already connecting to a session. Please wait...', 'system');
    return;
  }
  
  if (!id) {
    updateStatus('Invalid session ID');
    return;
  }
  
  isConnecting = true;
  updateStatus('Joining session...');
  toggleConnectionButtons(false);
  
  try {
    // For custom sessions that we know are client-side only
    if (id.startsWith('local-') || id === customSessionIdInput?.value?.trim()) {
      createLocalSessionWithId(id);
      return;
    }
    
    // Request to join the session
    const response = await fetchWithTimeout('/api/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'join',
        sessionId: id,
        clientId,
        username
      })
    });
    
    // Check if we got a 404 (session not found)
    if (response.status === 404) {
      console.log('Session not found, creating local session with this ID');
      createLocalSessionWithId(id);
      return;
    }
    
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message || 'Failed to join session');
    }
    
    // Handle successful join
    handleSuccessfulJoin(data);
    
  } catch (error) {
    console.error('Error joining session:', error);
    updateStatus('Error: ' + error.message);
    addMessage(`SYSTEM: Error joining session: ${error.message}`, 'system');
    
    // If this was a custom session ID, create a local session with it
    if (id === customSessionIdInput?.value?.trim()) {
      createLocalSessionWithId(id);
    }
  } finally {
    isConnecting = false;
    toggleConnectionButtons(true);
  }
}

// Create a local session with a specific ID
function createLocalSessionWithId(id) {
  console.log('Creating local session with ID:', id);
  
  // Set up client-side session data
  sessionId = id;
  clientId = clientId || generateId();
  sessionUsers = {
    [clientId]: {
      username: username,
      joinedAt: new Date().toISOString()
    }
  };
  
  // Save to localStorage
  saveSessionToLocalStorage();
  
  // Update UI
  document.getElementById('sessionIdDisplay').textContent = id;
  document.getElementById('sessionInfo').classList.remove('hidden');
  updateStatus(`In local session: ${id}`);
  
  // Update user list
  updateUserList(sessionUsers);
  
  // Add message to chat
  addMessage(`SYSTEM: Created local session ${id}`, 'system');
  
  // Reset connecting state
  isConnecting = false;
  toggleConnectionButtons(true);
}

// Start polling for session updates
function startPolling() {
  // Stop existing polling if any
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
  
  // Don't poll for local sessions
  if (sessionId && (sessionId.startsWith('local-') || sessionId === customSessionIdInput?.value?.trim())) {
    console.log('Local session detected, skipping polling');
    return;
  }
  
  // Poll every 5 seconds
  pollingInterval = setInterval(async () => {
    if (!sessionId) {
      clearInterval(pollingInterval);
      return;
    }
    
    try {
      // Get session info
      const response = await fetchWithTimeout(`/api/session?sessionId=${sessionId}`, {}, 3000);
      
      if (!response.ok) {
        console.error(`Error polling session: ${response.status}`);
        return;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        console.error('Error polling session:', data.message);
        return;
      }
      
      // Update UI if user count changed
      if (data.session.userCount !== Object.keys(sessionUsers).length) {
        // Rejoin to get updated user list
        joinSession(sessionId);
      }
    } catch (error) {
      console.error('Error polling session:', error);
      // Don't stop polling on temporary errors
    }
  }, 5000);
}

// Update user list
function updateUserList(users) {
  const userList = document.getElementById('userList');
  if (!userList) return;
  
  userList.innerHTML = '';
  
  Object.entries(users).forEach(([id, user]) => {
    addUserToList(id, user.username);
  });
}

// Add user to list
function addUserToList(id, name) {
  const userList = document.getElementById('userList');
  if (!userList) return;
  
  // Skip if already in the list
  if (document.getElementById(`user-${id}`)) {
    return;
  }
  
  const userEl = document.createElement('div');
  userEl.id = `user-${id}`;
  userEl.className = 'user-item';
  if (id === clientId) {
    userEl.className += ' self';
  }
  userEl.textContent = name;
  
  userList.appendChild(userEl);
}

// Update user in list
function updateUserInList(id, newName) {
  const userEl = document.getElementById(`user-${id}`);
  if (userEl) {
    userEl.textContent = newName;
  } else {
    // If user not in list, add them
    addUserToList(id, newName);
  }
}

// Remove user from list
function removeUserFromList(id) {
  const userEl = document.getElementById(`user-${id}`);
  if (userEl) {
    userEl.remove();
  }
}

// Leave the current session
async function leaveSession() {
  if (!sessionId || !clientId) {
    updateStatus('Not in a session');
    return;
  }
  
  updateStatus('Leaving session...');
  
  try {
    // For local/custom sessions, just clean up locally
    if (sessionId.startsWith('local-') || sessionId === customSessionIdInput?.value?.trim()) {
      cleanupLocalSession();
      return;
    }
    
    // Request to leave the session
    const response = await fetchWithTimeout('/api/session', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        clientId
      })
    }, 5000);
    
    // Clean up locally regardless of server response
    cleanupLocalSession();
    
  } catch (error) {
    console.error('Error leaving session:', error);
    updateStatus('Error: ' + error.message);
    
    // Clean up locally anyway on error
    cleanupLocalSession();
  }
}

// Clean up a local session
function cleanupLocalSession() {
  // Update UI
  document.getElementById('sessionInfo').classList.add('hidden');
  updateStatus('Not in a session');
  addMessage(`SYSTEM: You left session ${sessionId}`, 'system');
  
  // Stop polling
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  
  // Clear session data
  sessionId = null;
  sessionUsers = {};
  
  // Remove from localStorage
  localStorage.removeItem('carnageSession');
}

// Update multiplayer status
function updateStatus(status) {
  const statusEl = document.getElementById('mpStatus');
  if (statusEl) {
    statusEl.textContent = status;
  }
}

// Send message in multiplayer mode (simplified without real-time)
async function sendMultiplayerMessage(message, askClaude = false, agentType = activeAgent) {
  if (!sessionId || !clientId) {
    addMessage('SYSTEM: Not in a session. Create or join a session first.', 'system');
    return;
  }
  
  // Show the user's message
  const msgPrefix = username ? `${username}: ` : '';
  addMessage(msgPrefix + message, 'user');
  
  // For local sessions, we only update the local UI
  if (sessionId.startsWith('local-') || sessionId === customSessionIdInput?.value?.trim()) {
    // If asking Claude, get the AI response
    if (askClaude) {
      const thinking = showThinking(agentType);
      
      // Wait before responding to simulate network delay
      setTimeout(() => {
        thinking.clear();
        
        // Call Claude API
        askClaude(message, agentType).then(response => {
          const agentLabel = agentType === 'venom' ? 'VENOM' : 'CARNAGE';
          addMessage(`${agentLabel}: ${response}`, agentType);
        }).catch(error => {
          addMessage(`SYSTEM: Error getting AI response: ${error.message}`, 'system');
        });
      }, 1000);
    }
    return;
  }
  
  // For server sessions, try to send the message to the server
  try {
    await fetchWithTimeout('/api/session/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        clientId,
        username,
        message,
        askClaude,
        agentType
      })
    }, 5000);
    
    // If asking Claude, simulate the AI response
    if (askClaude) {
      const thinking = showThinking(agentType);
      
      // Wait before responding to simulate network delay
      setTimeout(() => {
        thinking.clear();
        
        // Call Claude API
        askClaude(message, agentType).then(response => {
          const agentLabel = agentType === 'venom' ? 'VENOM' : 'CARNAGE';
          addMessage(`${agentLabel}: ${response}`, agentType);
        }).catch(error => {
          addMessage(`SYSTEM: Error getting AI response: ${error.message}`, 'system');
        });
      }, 1000);
    }
  } catch (error) {
    console.error('Error sending message to server:', error);
    addMessage(`SYSTEM: Error sending message to server: ${error.message}`, 'system');
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
          if (sessionId) {
            // In multiplayer, send to session
            sendMultiplayerMessage(args, true, 'venom');
          } else {
            // In single player, switch agent temporarily
            const prevAgent = activeAgent;
            activeAgent = 'venom';
            document.body.setAttribute('data-agent', 'venom');
            
            // Call the API and display the response
            askClaudeAndDisplayResponse(args, 'venom').then(() => {
              // Switch back after response is received
              activeAgent = prevAgent;
              document.body.setAttribute('data-agent', prevAgent);
            }).catch(error => {
              console.error("Error in venom command:", error);
              addMessage(`SYSTEM: Error getting VENOM response: ${error.message}`, 'system');
              // Make sure we switch back even on error
              activeAgent = prevAgent;
              document.body.setAttribute('data-agent', prevAgent);
            });
          }
        } else {
          addMessage("SYSTEM: Please provide a message for VENOM", 'system');
        }
        break;
      case '/carnage': // Added this case to handle /carnage command
      case '/claude':
        if (args) {
          if (sessionId) {
            // In multiplayer, send to session
            sendMultiplayerMessage(args, true, 'carnage');
          } else {
            // In single player
            const prevAgent = activeAgent;
            activeAgent = 'carnage';
            document.body.setAttribute('data-agent', 'carnage');
            
            // Call the API and display the response
            askClaudeAndDisplayResponse(args, 'carnage').then(() => {
              // Reset to previous agent if needed
              if (prevAgent !== 'carnage') {
                activeAgent = prevAgent;
                document.body.setAttribute('data-agent', prevAgent);
              }
            }).catch(error => {
              console.error("Error in carnage command:", error);
              addMessage(`SYSTEM: Error getting CARNAGE response: ${error.message}`, 'system');
              if (prevAgent !== 'carnage') {
                activeAgent = prevAgent;
                document.body.setAttribute('data-agent', prevAgent);
              }
            });
          }
        } else {
          addMessage("SYSTEM: Please provide a message for CARNAGE", 'system');
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
      case '/name':
        // Set username
        if (args) {
          // Validate username - only allow letters, numbers, and common symbols
          if (!/^[a-zA-Z0-9_\-\.]{1,20}$/.test(args)) {
            addMessage('SYSTEM: Username must be 1-20 characters and contain only letters, numbers, _, -, or .', 'system');
            return;
          }
          
          const oldUsername = username;
          username = args;
          
          // Update local UI to show username change
          addMessage(`SYSTEM: You are now known as ${username} (was ${oldUsername})`, 'system');
          
          // Update session data in localStorage
          if (sessionId) {
            saveSessionToLocalStorage();
          }
          
          // Update the user in the connected users list directly
          if (clientId) {
            // Update user in sessionUsers object
            if (sessionUsers[clientId]) {
              sessionUsers[clientId].username = username;
            }
            
            // Update user in UI list
            updateUserInList(clientId, username);
          }
          
          // Notify other users about the username change
          if (sessionId) {
            updateUsernameOnServer(oldUsername, username);
          }
        } else {
          addMessage(`SYSTEM: Your current username is ${username}`, 'system');
          addMessage('SYSTEM: To change it, use "/name NewUsername"', 'system');
        }
        break;
      case '/create':
        // Create a new session
        createSession();
        break;
      case '/join':
        // Join a session
        if (args) {
          joinSession(args);
        } else {
          joinSessionPrompt();
        }
        break;
      case '/leave':
        // Leave the current session
        leaveSession();
        break;
      case '/clear':
        // Clear the chat window
        clearChatWindow();
        break;
      default:
        addMessage(`SYSTEM: Unknown command: ${cmd}`, 'system');
    }
  } else {
    // Regular message
    if (sessionId) {
      // In multiplayer, send to session
      sendMultiplayerMessage(command);
    } else {
      // In single player, ask Claude directly and display the response
      askClaudeAndDisplayResponse(command);
    }
  }
}

// Clear the chat window
function clearChatWindow() {
  const chatWindow = document.getElementById('chatWindow');
  if (chatWindow) {
    chatWindow.innerHTML = '';
    addMessage('SYSTEM: Chat cleared', 'system');
  }
}

// Update username on server and notify other users
async function updateUsernameOnServer(oldUsername, newUsername) {
  try {
    // Only attempt if we're in a session
    if (!sessionId || !clientId) {
      return;
    }

    console.log(`Updating username from ${oldUsername} to ${newUsername}`);
    
    // For local/custom sessions, update locally
    if (sessionId.startsWith('local-') || sessionId === customSessionIdInput?.value?.trim()) {
      // Update locally first
      if (sessionUsers[clientId]) {
        sessionUsers[clientId].username = newUsername;
      }
      
      // Simulate a broadcast message to all users in the session
      const message = `SYSTEM: ${oldUsername} is now known as ${newUsername}`;
      addMessage(message, 'system');
      
      return;
    }
    
    // For server sessions, try the API if it exists
    try {
      const response = await fetchWithTimeout('/api/session/username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId,
          clientId,
          oldUsername,
          newUsername
        })
      }, 5000);
      
      if (!response.ok) {
        console.log('Username update API not available, using message-based approach');
        
        // Fallback: Send a system message that will be seen by all users
        sendSystemMessageToAll(`${oldUsername} is now known as ${newUsername}`);
      }
    } catch (error) {
      console.error('Error updating username via API:', error);
      
      // Fallback: Send a system message that will be seen by all users
      sendSystemMessageToAll(`${oldUsername} is now known as ${newUsername}`);
    }
  } catch (error) {
    console.error('Error in updateUsernameOnServer:', error);
  }
}

// Send a system message that all users in the session will see
async function sendSystemMessageToAll(message) {
  try {
    if (!sessionId || !clientId) {
      return;
    }
    
    // Local sessions don't need this
    if (sessionId.startsWith('local-') || sessionId === customSessionIdInput?.value?.trim()) {
      return;
    }
    
    // Try to use the message API to send the system message
    await fetchWithTimeout('/api/session/message', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sessionId,
        clientId,
        message: message,
        type: 'system'
      })
    }, 5000);
  } catch (error) {
    console.error('Error sending system message:', error);
  }
}

// Helper function to call Claude API and display the response 
async function askClaudeAndDisplayResponse(question, agentType = activeAgent) {
  try {
    const response = await askClaude(question, agentType);
    const agentLabel = agentType === 'venom' ? 'VENOM' : 'CARNAGE';
    addMessage(`${agentLabel}: ${response}`, agentType);
    return response;
  } catch (error) {
    console.error('Error in askClaudeAndDisplayResponse:', error);
    addMessage(`SYSTEM: Error getting AI response: ${error.message}`, 'system');
    throw error;
  }
}

// Show help information
function showHelp() {
  const helpText = `
AVAILABLE COMMANDS:

CHAT COMMANDS:
/help - Show this help message
/claude [message] - Ask CARNAGE specifically
/carnage [message] - Alternative way to ask CARNAGE
/venom [message] - Ask VENOM instead
/clear - Clear the chat window

MULTIPLAYER COMMANDS:
/create - Create a new session
/join [id] - Join a session
/leave - Leave the current session
/name [username] - Set or view your username

DIAGNOSTIC COMMANDS:
/test - Test API connection
/api - Check base API endpoint

You can also type any message directly to chat or ask the current agent.
  `;
  
  addMessage("SYSTEM: " + helpText, 'system');
}

// Add a message to the output
function addMessage(text, from = 'system') {
  const output = document.getElementById('chatWindow');
  if (!output) return null;
  
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
function showThinking(agent = activeAgent) {
  const agentLabel = agent === 'venom' ? 'VENOM' : 'CARNAGE';
  const msg = addMessage(`${agentLabel} IS THINKING`, agent);
  if (!msg) return { clear: () => {} }; // Return dummy object if message creation failed
  
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
  
  msg._interval = interval;
  msg._agentType = agent;
  
  return {
    element: msg,
    clear: () => {
      clearInterval(interval);
      if (msg && msg.parentNode) {
        msg.remove();
      }
    }
  };
}

// Check base API endpoint
async function checkBaseApi() {
  const thinking = showThinking();
  
  try {
    console.log('Checking base API...');
    const response = await fetchWithTimeout('/api', {}, 5000);
    
    thinking.clear();
    
    if (response.ok) {
      try {
        const data = await response.json();
        addMessage(`SYSTEM: Base API is working! Response: ${JSON.stringify(data)}`, 'system');
      } catch (error) {
        const text = await response.text();
        addMessage(`SYSTEM: Base API returned non-JSON: ${text.substring(0, 100)}...`, 'system');
      }
    } else {
      addMessage(`SYSTEM: Base API returned error ${response.status}`, 'system');
    }
  } catch (error) {
    thinking.clear();
    addMessage(`SYSTEM: Error checking base API: ${error.message}`, 'system');
  }
}

// Simple test to check API connection
async function testApiConnection() {
  const thinking = showThinking();
  
  try {
    console.log('Testing API connection...');
    const response = await fetchWithTimeout('/api/test', {}, 5000);
    
    thinking.clear();
    
    if (response.ok) {
      try {
        const data = await response.json();
        addMessage(`SYSTEM: API test successful! The test endpoint is working.`, 'system');
        
        // Check if API key is configured
        if (data.apiKey) {
          addMessage(`SYSTEM: ${data.apiKey}`, 'system');
        }
      } catch (error) {
        const text = await response.text();
        addMessage(`SYSTEM: API returned non-JSON: ${text.substring(0, 100)}...`, 'system');
      }
    } else {
      addMessage(`SYSTEM: API test failed with status ${response.status}`, 'system');
      try {
        const text = await response.text();
        addMessage(`SYSTEM: Error details: ${text.substring(0, 100)}...`, 'system');
      } catch (error) {
        addMessage(`SYSTEM: Could not get error details: ${error.message}`, 'system');
      }
    }
  } catch (error) {
    thinking.clear();
    addMessage(`SYSTEM: API connection error: ${error.message}`, 'system');
  }
}

// Ask Claude API (single player mode)
async function askClaude(question, agentType = activeAgent) {
  const thinking = showThinking(agentType);
  
  try {
    console.log('Sending request to Claude API with agent:', agentType);
    
    // Prepare request to our API endpoint
    const response = await fetchWithTimeout('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system: systemPrompts[agentType],
        messages: [
          { role: 'user', content: question }
        ]
      })
    }, 30000); // Longer timeout for Claude API
    
    // Check for non-JSON responses
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const textContent = await response.text();
      thinking.clear();
      console.error('Non-JSON response:', textContent.substring(0, 200));
      addMessage(`SYSTEM: API returned non-JSON response. Please check server logs.`, 'system');
      throw new Error('Non-JSON response from API');
    }
    
    // Parse the response
    const data = await response.json();
    
    // Check for error response
    if (!response.ok) {
      throw new Error(data.message || `API error: ${response.status}`);
    }
    
    console.log('Response received from Claude API for agent:', agentType);
    
    // Remove thinking indicator
    thinking.clear();
    
    // Extract Claude's response
    if (data?.content?.[0]?.text) {
      return data.content[0].text;
    } else {
      throw new Error('Unexpected response format from API');
    }
    
  } catch (error) {
    // Clear thinking indicator and show error
    thinking.clear();
    console.error('Error in askClaude:', error);
    throw error; // Re-throw for promise chaining
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
