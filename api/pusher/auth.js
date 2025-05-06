import Pusher from 'pusher';

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

  // Get socket ID and channel name from request
  const { socket_id, channel_name, username } = req.body;
  
  // Validate request parameters
  if (!socket_id || !channel_name) {
    return res.status(400).json({
      success: false,
      message: 'Socket ID and channel name are required'
    });
  }

  try {
    // Handle different channel types
    if (channel_name.startsWith('presence-')) {
      // For presence channels, include user info
      const presenceData = {
        user_id: socket_id, // Using socket_id as user_id for simplicity
        user_info: {
          username: username || `user-${socket_id.substring(0, 5)}`
        }
      };
      
      const auth = pusher.authorizeChannel(socket_id, channel_name, presenceData);
      return res.status(200).json(auth);
    } else {
      // For private channels
      const auth = pusher.authorizeChannel(socket_id, channel_name);
      return res.status(200).json(auth);
    }
  } catch (error) {
    console.error('Pusher auth error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error authenticating with Pusher'
    });
  }
}
