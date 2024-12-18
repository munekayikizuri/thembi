const mongoose = require('mongoose');
const Invoice = require('@/models/appModels/Invoice');
const Client = require('@/models/appModels/Client');
const Admin = require('@/models/coreModels/Admin');
const { SendInvoice, SendQuote, SendPaymentReceipt } = require('@/emailTemplate/SendEmailTemplate');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const mail = async (req, res) => {
  try {
    const { entity, jsonData } = req.body;
    if (!entity || !jsonData) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: entity or jsonData.',
      });
    }

    // Validate entity and set template
    const templates = {
      invoice: SendInvoice,
      quote: SendQuote,
      payment: SendPaymentReceipt,
    };

    const template = templates[entity];
    if (typeof template !== 'function') {
      return res.status(400).json({
        success: false,
        message: `Invalid entity. Allowed entities: ${Object.keys(templates).join(', ')}`,
      });
    }

    // Fetch invoice details
    const invoice = await Invoice.findById(jsonData.id).lean();
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: `Invoice with ID ${jsonData.id} not found.`,
      });
    }

    // Fetch the client's email based on the client ID in the invoice
    const client = await Client.findById(invoice.client).lean();
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client with ID ${invoice.client} not found.`,
      });
    }

    // Retrieve senderEmail by fetching the admin who created the client
    const senderId = client.createdBy;
    if (!senderId) {
      return res.status(404).json({
        success: false,
        message: 'Client does not have a valid createdBy field.',
      });
    }

    const admin = await Admin.findById(senderId).lean();
    if (!admin || !admin.email) {
      return res.status(404).json({
        success: false,
        message: `Admin with ID ${senderId} not found or does not have an email.`,
      });
    }

    const senderEmail = admin.email;

    // Generate email body using the template
    const htmlBody = template({
      title: `Invoice #${invoice.number} - ${invoice.year}`,
      name: client.name || 'Valued Customer',
      time: new Date(),
    });
    

    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: '8213fc001@smtp-brevo.com', // Your Brevo SMTP username
        pass: 'BS9D1I2F6gpNtqkb',        // Your Brevo SMTP password
      },
    });

    // Email options
    const mailOptions = {
      from: `"Thembi CRM" <noreply@thembi.kizuri.co.za>`,
      to: client.email,
      subject: `Invoice #${invoice.number} - ${invoice.year} From ${admin.name}`,
      html: htmlBody,
      replyTo: senderEmail,
      attachments: [
        {
          filename: `Invoice-${invoice.number}.pdf`, // Customize the filename
          path: path.resolve(__dirname, `../../../public/download/invoice/${invoice.pdf}`), // Correct absolute path
          contentType: 'application/pdf', // MIME type
        },
      ],
    };
    

    // Send email
    const info = await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      result: info,
      message: `Email sent successfully to ${client.email}.`,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while sending the email.',
      error: error.message,
    });
  }
};

module.exports = mail;
