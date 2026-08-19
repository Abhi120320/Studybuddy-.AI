const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'studybuddy-super-secret-key-1337';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, error: 'Invalid or expired access token' });
    }
    
    req.user = {
      id: user.id,
      email: user.email
    };
    next();
  });
}

module.exports = { authenticateToken, JWT_SECRET };
