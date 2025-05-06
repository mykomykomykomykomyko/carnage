// Simplified session management without Pusher integration
import { v4 as uuidv4 } from 'uuid';

// In-memory store for active sessions (note: this resets on serverless function cold starts)
const sessions = {};

export default function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // GET: List all sessions or get details of specific session
  if (req.method === 'GET') {
    try {
      const { sessionId } = req.query;
      
      if (sessionId) {
        // Return specific session
        const session = sessions[sessionId];
        if (!session) {
          return res.status(404).json({
            success: false,
            message: 'Session not found'
          });
        }
        
        return res.status(200).json({
          success: true,
          session: {
            id: sessionId,
            created: session.created,
            userCount: Object.keys(session.users || {}).length
          }
        });
      } else {
        // Return all sessions
        const sessionList = Object.entries(sessions).map(([id, session]) => ({
          id,
          created: session.created,
          userCount: Object.keys(session.users || {}).length
        }));
        
        return res.status(200).json({
          success: true,
          sessions: sessionList
        });
      }
    } catch (error) {
      console.error('Error in GET /api/session:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }
  
  // POST: Create or join session
  if (req.method === 'POST') {
    try {
      const { action, sessionId, clientId, username } = req.body;
      
      // Create a new session
      if (action === 'create') {
        const newSessionId = uuidv4();
        
        sessions[newSessionId] = {
          created: new Date().toISOString(),
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
        const userUsername = username || `user-${userClientId.substring(0, 4)}`;
        
        // Add user to session
        session.users[userClientId] = {
          username: userUsername,
          joinedAt: new Date().toISOString()
        };
        
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
    } catch (error) {
      console.error('Error in POST /api/session:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }
  
  // DELETE: Leave a session
  if (req.method === 'DELETE') {
    try {
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
      
      // Clean up empty sessions
      if (Object.keys(session.users).length === 0) {
        delete sessions[sessionId];
      }
      
      return res.status(200).json({
        success: true,
        message: 'Successfully left the session'
      });
    } catch (error) {
      console.error('Error in DELETE /api/session:', error);
      return res.status(500).json({
        success: false,
        message: 'Server error: ' + error.message
      });
    }
  }
  
  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}
