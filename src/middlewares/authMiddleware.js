const jwt = require('jsonwebtoken');
const Admin = require('@/models/coreModels/Admin');

const authMiddleware = async (req, res, next) => {
  try {
    // First try to get token from query string for downloads
    let token = req.query.token;

    // If no query token, check authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
          success: false, 
          message: 'Authorization token required.' 
        });
      }
      token = authHeader.split(' ')[1];
    }

    // Verify and decode token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);

    // Find admin
    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Admin not found.' 
      });
    }

    // Set user info in request
    req.admin = admin;  // Set full admin object
    req.user = { 
      id: admin._id.toString(), 
      name: admin.name, 
      role: admin.role 
    };

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token format.' 
      });
    } else if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token has expired.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed.' 
    });
  }
};

module.exports = authMiddleware;