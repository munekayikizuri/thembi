const generateEmailTemplate = ({ title, name = '', time = new Date(), previewText }) => {
    return `
      <div>
          <head data-id="__react-email-head">
              <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
              <title>${title}</title>
          </head>
          <div id="__react-email-preview" style="display:none;overflow:hidden;line-height:1px;opacity:0;max-height:0;max-width:0">${previewText}</div>
          <body data-id="__react-email-body">
              <h2 data-id="react-email-heading">${title}</h2>
              <hr data-id="react-email-hr" style="width:100%;border:none;border-top:1px solid #eaeaea" />
              <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Hello ${name},</p>
              <p data-id="react-email-text" style="font-size:14px;line-height:24px;margin:16px 0">Here's the ${previewText.toLowerCase()} you requested at ${time}</p>
          </body>
      </div>
    `;
  };
  
  const SendInvoice = (data) => generateEmailTemplate({ ...data, previewText: 'Invoice' });
  const SendQuote = (data) => generateEmailTemplate({ ...data, previewText: 'Quote' });
  const SendOffer = (data) => generateEmailTemplate({ ...data, previewText: 'Offer' });
  const SendPaymentReceipt = (data) => generateEmailTemplate({ ...data, previewText: 'Payment Receipt' });
  
  module.exports = { SendInvoice, SendQuote, SendOffer, SendPaymentReceipt };
  