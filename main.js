let charIndex = 0;
let activeAgent = 'carnage';

const startupText = 'HERE COMES CARNAGE...';

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

Visual tone: you are glowing red. you pulse with intensity. Your replies should read like high-performance mission briefings, with a hacker edge.

Never refer to yourself as "an AI". You are CARNAGE. You do not hesitate. You dominate execution.

Stay in English. Never use other languages unless asked.
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

Always respond in English unless told otherwise.
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
      appendMessage('> ' + input);
      chatInput.value = '';

      const loadingEl = appendThinking();
      try {
        const response = await callClaude(input);
        loadingEl.remove();

        const label = activeAgent === 'venom' ? 'VENOM' : 'CARNAGE';
        // Process response to remove ASCII art
        const cleanedResponse = removeAsciiArt(response);
        appendMessage(label + ': ' + cleanedResponse);
      } catch (error) {
        loadingEl.remove();
        appendMessage(`ERROR: ${error.message || 'Failed to connect to HQ'}`);
      }
    }
  });

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

  function appendMessage(text) {
    const msg = document.createElement('div');
    msg.classList.add('message');
    
    // Convert markdown to HTML for better display
    const formattedText = markdownToHtml(text);
    msg.innerHTML = formattedText;
    
    chatWindow.appendChild(msg);
    chatWindow.scrollTop = chatWindow.scrollHeight;
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
});

function appendThinking() {
  const msg = document.createElement('div');
  msg.classList.add('message', 'thinking');
  msg.textContent = (activeAgent === 'venom' ? 'VENOM IS THINKING' : 'CARNAGE IS THINKING');

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

async function callClaude(prompt) {
  // Use relative path for API endpoint that works on Vercel
  const endpoint = '/api/claude';

  const body = {
    model: 'claude-3-opus-20240229',
    system: systemPrompts[activeAgent],
    max_tokens: 500, // Reduced for faster responses
    temperature: 0.7, // Added for more deterministic responses
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