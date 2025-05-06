# CARNAGE Terminal - Multiplayer Edition

This is a multiplayer version of the CARNAGE terminal that allows multiple users to join sessions and interact with both CARNAGE and VENOM AI personas.

## Setup Instructions

### 1. Environment Variables

You need to set the following environment variables in your Vercel project:

```
CLAUDE_API_KEY=your-anthropic-api-key
PUSHER_APP_ID=1987246
PUSHER_KEY=49fa5db19939b47d29b1
PUSHER_SECRET=97ffd4c4a58012932506
PUSHER_CLUSTER=us3
```

### 2. Required Files

Make sure your project has these files:
- `index.html` - Main HTML file
- `style.css` - Styling for the terminal
- `main.js` - Main client-side code with multiplayer functionality
- `api/claude.js` - Claude API endpoint
- `api/test.js` - Test API endpoint
- `api/index.js` - Base API endpoint
- `api/session.js` - Session management API
- `api/message.js` - Message handling API
- `api/pusher/auth.js` - Pusher authentication endpoint
- `vercel.json` - Vercel configuration
- `package.json` - Dependencies

### 3. Dependencies

Install the required dependencies:

```bash
npm install pusher uuid
```

## How to Use Multiplayer

### Commands

- `/create` - Create a new session
- `/join [id]` - Join an existing session
- `/leave` - Leave the current session
- `/name [username]` - Set your username

### Sharing Sessions

To invite someone to your session:
1. Create a session with `/create`
2. Share the session ID shown in the multiplayer panel
3. They can join with `/join [id]` where [id] is your session ID

### Using CARNAGE and VENOM

In a multiplayer session:
- Regular messages are shared with all users
- `/claude [message]` or `/carnage [message]` - Ask CARNAGE a question (everyone sees the response)
- `/venom [message]` - Ask VENOM a question (everyone sees the response)

## Troubleshooting

If you encounter issues:
- Check the browser console for errors
- Verify your Pusher credentials are correct
- Make sure all API endpoints are deployed correctly
- Ensure your Claude API key is valid and has sufficient quota

## Technical Details

- Real-time communication is handled by Pusher
- Claude API integration uses Anthropic's Claude API
- Sessions are tracked on the server side
- User presence is managed via Pusher presence channels
