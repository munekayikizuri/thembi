const mongoose = require('mongoose');
const Quote = require('@/models/appModels/Quote');
const Client = require('@/models/appModels/Client');
const Admin = require('@/models/coreModels/Admin');
const { SendInvoice, SendQuote, SendPaymentReceipt } = require('@/emailTemplate/SendEmailTemplate');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const PdfStorage = require('@/models/appModels/PdfStorage');

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

    // Fetch quote details
    const quote = await Quote.findById(jsonData.id).lean();
    if (!quote) {
      return res.status(404).json({
        success: false,
        message: `Quote with ID ${jsonData.id} not found.`,
      });
    }
    // Fetch PDF from PdfStorage
    const pdfDoc = await PdfStorage.findOne({
      modelName: 'Quote',
      documentId: quote._id
    });

    if (!pdfDoc || !pdfDoc.pdfData) {
      return res.status(404).json({
        success: false,
        message: 'PDF document not found'
      });
    }
    // Fetch the client's email based on the client ID in the invoice
    const client = await Client.findById(quote.client).lean();
    if (!client) {
      return res.status(404).json({
        success: false,
        message: `Client with ID ${quote.client} not found.`,
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
      title: `Quote #${quote.number} - ${quote.year}`,
      name: client.name || 'Valued Customer',
      time: new Date(),
    });
    

    // Configure nodemailer transport
    const transporter = nodemailer.createTransport({
      host: 'smtp-relay.brevo.com',
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: "85c3c0001@smtp-brevo.com", // Your Brevo SMTP username
        pass: "P0V9IMJp5rn6E4KW",        // Your Brevo SMTP password
      },
    });

    // Email options
    const mailOptions = {
      from: `"Thembi CRM" <munekayiantoine@gmail.com>`,
      to: client.email,
      subject: `Quote #${quote.number} - ${quote.year} From ${admin.name}`,
      html: htmlBody,
      replyTo: senderEmail,
      attachments: [
        {
         // filename: `Quote-${quote.number}.pdf`, // Customize the filename
         // path: path.resolve(__dirname, `../../../public/download/quote/${quote.pdf}`), // Correct absolute path
          filename: pdfDoc.filename,
          content: pdfDoc.pdfData, // Use the PDF data from database
          contentType: 'application/pdf', // MIME type
        },
      ],
    };
    

    // Send email
    const info = await transporter.sendMail(mailOptions);
    await Quote.findByIdAndUpdate(jsonData.id, { status: 'sent' });

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
