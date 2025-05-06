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
    }, 1500);
  }
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
  console.log("CARNAGE terminal initializing");
  document.body.setAttribute('data-agent', activeAgent);
  
  document.getElementById('startupText').textContent = '';
  typeStartup();

  // Set up input handler with improved event handling
  const chatInput = document.getElementById('chatInput');
  
  // Handle Enter key specifically with both keydown and keypress events
  chatInput.addEventListener('keydown', function(e) {
    console.log('Key pressed:', e.key, 'KeyCode:', e.keyCode);
    
    // Check for Enter key (both key name and keyCode for wider compatibility)
    if ((e.key === 'Enter' || e.keyCode === 13) && this.value.trim()) {
      e.preventDefault(); // Prevent default to ensure consistent behavior
      console.log('Enter detected, processing command:', this.value.trim());
      
      const command = this.value.trim();
      handleCommand(command);
      this.value = '';
    }
  });
  
  // Make clicking ENTER text also submit
  document.getElementById('enterHint').addEventListener('click', function() {
    const inputValue = chatInput.value.trim();
    if (inputValue) {
      console.log('ENTER clicked, processing command:', inputValue);
      handleCommand(inputValue);
      chatInput.value = '';
      chatInput.focus(); // Return focus to input after clicking
    }
  });
});

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
          // Switch to Venom, ask Claude, then switch back
          const prevAgent = activeAgent;
          activeAgent = 'venom';
          document.body.setAttribute('data-agent', 'venom');
          askClaude(args).then(() => {
            // Switch back after response is received
            activeAgent = prevAgent;
            document.body.setAttribute('data-agent', prevAgent);
          }).catch(error => {
            console.error("Error in venom command:", error);
            // Make sure we switch back even on error
            activeAgent = prevAgent;
            document.body.setAttribute('data-agent', prevAgent);
          });
        } else {
          addMessage("SYSTEM: Please provide a message for VENOM");
        }
        break;
      case '/carnage': // Added this case to handle /carnage command
      case '/claude':
        if (args) {
          // Ensure we're using Carnage for these commands
          const prevAgent = activeAgent;
          activeAgent = 'carnage';
          document.body.setAttribute('data-agent', 'carnage');
          askClaude(args).then(() => {
            // Reset to previous agent if needed
            if (prevAgent !== 'carnage') {
              activeAgent = prevAgent;
              document.body.setAttribute('data-agent', prevAgent);
            }
          });
