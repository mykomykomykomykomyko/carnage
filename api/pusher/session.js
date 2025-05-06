import Pusher from 'pusher';
import { v4 as uuidv4 } from 'uuid';

// Store active sessions (will reset on serverless function cold starts)
const sessions = {};

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Initialize Pusher
  const pusher = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true
  });

  // GET: List all active sessions or get details of a specific session
  if (req.method === 'GET') {
    const { sessionId } = req.query;
    
    if (sessionId) {
      // Return details of a specific session
      const session = sessions[sessionId];
      
      if (session) {
        return res.status(200).json({
          success: true,
          session: {
            id: sessionId,
            createdAt: session.createdAt,
            userCount: Object.keys(session.users || {}).length
          }
        });
      } else {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }
    } else {
      // Return list of all active sessions
      const sessionList = Object.entries(sessions).map(([id, session]) => ({
        id,
        createdAt: session.createdAt,
        userCount: Object.keys(session.users || {}).length
      }));
      
      return res.status(200).json({
        success: true,
        sessions: sessionList
      });
    }
  }
  
  // POST: Create a new session or join an existing one
  if (req.method === 'POST') {
    const { action, sessionId, clientId, username } = req.body;
    
    // Create a new session
    if (action === 'create') {
      const newSessionId = uuidv4();
      
      sessions[newSessionId] = {
        createdAt: new Date().toISOString(),
        users: {},
        messages: []
      };
      
      return res.status(200).json({
        success: true,
        sessionId: newSessionId
      });
    }
    
    // Join an existing session
    if (action === 'join') {
      if (!sessionId || !sessions[sessionId]) {
        return res.status(404).json({
          success: false,
          message: 'Session not found'
        });
      }
      
      const session = sessions[sessionId];
      const userClientId = clientId || uuidv4();
      const userUsername = username || `user-${userClientId.substring(0, 5)}`;
      
      // Add user to session
      session.users[userClientId] = {
        username: userUsername,
        joinedAt: new Date().toISOString()
      };
      
      // Notify other users about the new user
      try {
        await pusher.trigger(`presence-session-${sessionId}`, 'user-joined', {
          clientId: userClientId,
          username: userUsername,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error triggering Pusher event:', error);
      }
      
      return res.status(200).json({
        success: true,
        sessionId,
        clientId: userClientId,
        username: userUsername,
        users: session.users
      });
    }
    
    return res.status(400).json({
      success: false,
      message: 'Invalid action'
    });
  }
  
  // DELETE: Leave a session
  if (req.method === 'DELETE') {
    const { sessionId, clientId } = req.body;
    
    if (!sessionId || !clientId || !sessions[sessionId]) {
      return res.status(404).json({
        success: false,
        message: 'Session or client not found'
      });
    }
    
    const session = sessions[sessionId];
    const user = session.users[clientId];
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found in session'
      });
    }
    
    // Remove user from session
    delete session.users[clientId];
    
    // Notify other users
    try {
      await pusher.trigger(`presence-session-${sessionId}`, 'user-left', {
        clientId,
        username: user.username,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error triggering Pusher event:', error);
    }
    
    // Clean up empty sessions
    if (Object.keys(session.users).length === 0) {
      delete sessions[sessionId];
    }
    
    return res.status(200).json({
      success: true,
      message: 'Successfully left the session'
    });
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}
