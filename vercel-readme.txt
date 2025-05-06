# CARNAGE Terminal - Vercel Deployment Guide

This guide will help you deploy your CARNAGE Terminal on Vercel, making it accessible online.

## Prerequisites

1. A [Vercel](https://vercel.com) account
2. [Git](https://git-scm.com/) installed on your machine
3. Your CARNAGE Terminal project files

## Deployment Steps

### 1. Prepare Your Project for Vercel

Make sure your project has the following structure:

```
carnage-terminal/
├── api/
│   └── server.js     # Backend API for Claude
├── index.html        # Main HTML file
├── main.js           # Frontend JavaScript
├── style.css         # CSS styles
├── ascii.js          # ASCII art handling
├── vercel.json       # Vercel configuration
└── package.json      # Project dependencies
```

### 2. Install Vercel CLI (Optional)

For local testing and easy deployment:

```bash
npm install -g vercel
```

### 3. Deploy to Vercel

#### Option A: Using GitHub

1. Push your project to a GitHub repository
2. Log in to your Vercel account
3. Click "New Project"
4. Import your GitHub repository
5. Configure your project:
   - Framework Preset: Other
   - Root Directory: ./
   - Build Command: Leave empty
   - Output Directory: Leave empty
6. Click "Deploy"

#### Option B: Using Vercel CLI

1. Navigate to your project directory
2. Run the following command:

```bash
vercel
```

3. Follow the prompts to deploy your project

### 4. Configure Environment Variables (If Needed)

If you want to hide your API key, you can set it as an environment variable in the Vercel dashboard:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add a new variable:
   - Name: `CLAUDE_API_KEY`
   - Value: Your Anthropic Claude API key
4. Update your code to use `process.env.CLAUDE_API_KEY` instead of hardcoding it

### 5. Update API Endpoint in Main.js

Make sure your `main.js` file uses the correct API endpoint path:

```javascript
const endpoint = '/api/claude';
```

## Troubleshooting

If you encounter issues with your deployment:

1. Check Vercel logs for any errors
2. Verify your API key is correct
3. Ensure your file structure matches the requirements
4. Check for CORS issues (the Vercel setup should handle this automatically)

## Note on WebSocket Support

For deploying a multiplayer version with WebSockets, you'll need additional considerations:

1. WebSockets aren't supported in Vercel serverless functions
2. For multiplayer, consider these options:
   - Use a dedicated WebSocket service like Pusher or Socket.io
   - Deploy the WebSocket server portion to a service like Heroku or DigitalOcean
   - Use Vercel's integration with serverless WebSockets via services like Ably

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Anthropic Claude API Documentation](https://docs.anthropic.com/)
