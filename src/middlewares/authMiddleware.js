const jwt = require('jsonwebtoken');
const Admin = require('@/models/coreModels/Admin');

const authMiddleware = async (req, res, next) => {

  const authHeader = req.headers.authorization || `Bearer ${req.query.token}`;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded Token:', decoded);

    const admin = await Admin.findById(decoded.id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found.' });
    }

    req.user = { id: admin._id.toString(), name: admin.name, role: admin.role };

    next();
  } catch (error) {
    console.error('Auth Middleware Error:', error);
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = authMiddleware;
