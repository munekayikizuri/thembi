const mongoose = require('mongoose');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const paginatedList = require('./paginatedList');

const summary = require('./summary');

function modelController() {
  const Model = mongoose.model('Client');
  const Admin = mongoose.model('Admin'); // Reference Admin model
  const methods = createCRUDController('Client');

  // Custom method to create and associate clients
  methods.createAndAssociate = async (req, res) => {
    const { name, email, phone, address, country } = req.body;
  
    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required.' });
    }
  
    try {
      const adminId = req.user.id; // Populated by authMiddleware
      const admin = await Admin.findById(adminId);
  
      if (!admin) {
        return res.status(404).json({ success: false, message: 'Admin not found.' });
      }
  
      const client = new Model({
        name,
        email,
        phone,
        country,
        address,
        createdBy: adminId, // Reference to admin
      });
  
      await client.save();
  
      admin.clients.push(client._id);
      await admin.save();
  
      return res.status(201).json({
        success: true,
        message: 'Client created successfully!',
        result: client,
      });
    } catch (error) {
      console.error('Error creating and associating client:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error.',
        error: error.message,
      });
    }
  };
  

  methods.summary = (req, res) => summary(Model, req, res);
  methods.create = methods.createAndAssociate; // Override create
  methods.list = paginatedList;

  return methods;
}

module.exports = modelController();
