const { readFileSync } = require('fs');
const path = require('path');

// Read the Thembi CRM email template
const thembiPromotionalTemplate = readFileSync(path.join(__dirname, 'thembipromo.html'), 'utf8');

const generateEmailTemplate = ({ 
    title, 
    name = '', 
    time = new Date(), 
    previewText, 
    content = '', 
    includePromotion = true 
}) => {
    // Format the time in a more readable way
    const formattedTime = time instanceof Date 
        ? time.toLocaleString('en-US', { 
            dateStyle: 'medium', 
            timeStyle: 'short' 
        }) 
        : time;

    return `
      <div>
          <head data-id="__react-email-head">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>${title}</title>
              <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .email-content { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .email-header { background-color: #f4f4f4; padding: 10px; text-align: center; }
                  .email-body { padding: 20px; }
                  .email-footer { background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 12px; }
              </style>
          </head>
          <div id="__react-email-preview" style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${previewText}</div>
          <div class="email-content">
              <div class="email-header">
                  <h2 data-id="react-email-heading">${title}</h2>
              </div>
              <div class="email-body">
                  <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Hello ${name},</p>
                  <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">
                      Here's the ${previewText.toLowerCase()} you requested at ${formattedTime}
                  </p>
                  
                  ${content ? `<div class="document-content">${content}</div>` : ''}
                  
                  ${includePromotion ? thembiPromotionalTemplate : ''}
              </div>
              <div class="email-footer">
                  <p>© ${new Date().getFullYear()} Kizuri Technologies (Pty) Ltd</p>
              </div>
          </div>
      </div>
    `;
};

const createEmailGenerator = (defaultPreviewText) => (data) => 
    generateEmailTemplate({ 
        ...data, 
        previewText: defaultPreviewText,
        includePromotion: data.includePromotion ?? true
    });

const SendInvoice = createEmailGenerator('Invoice');
const SendQuote = createEmailGenerator('Quote');
const SendOffer = createEmailGenerator('Offer');
const SendPaymentReceipt = createEmailGenerator('Payment Receipt');

module.exports = { 
    generateEmailTemplate, 
    SendInvoice, 
    SendQuote, 
    SendOffer, 
    SendPaymentReceipt 
};