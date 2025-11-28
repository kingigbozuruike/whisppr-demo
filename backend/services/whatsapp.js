/**
 * WhatsApp Service
 * Handles sending WhatsApp messages and location pins
 */

const fetch = require('node-fetch');

/**
 * Send WhatsApp alert with text and location
 * @param {string} toNumber - Recipient phone number (E.164 format)
 * @param {string} message - Alert message text
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 */
async function sendWhatsAppAlert(toNumber, message, lat, lng) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  if (!accessToken || !phoneId) {
    throw new Error('WhatsApp credentials not configured');
  }
  
  try {
    // Send text message
    await sendWhatsAppMessage(toNumber, message);
    
    // Send location pin
    await sendWhatsAppLocation(toNumber, lat, lng);
    
    console.log(`[WhatsApp] Alert sent to ${toNumber}`);
    
  } catch (error) {
    console.error(`[WhatsApp] Failed to send alert to ${toNumber}:`, error);
    throw error;
  }
}

/**
 * Send WhatsApp text message
 */
async function sendWhatsAppMessage(toNumber, message) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber.replace('+', ''),
        type: 'text',
        text: { body: message }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
  
  return await response.json();
}

/**
 * Send WhatsApp location pin
 */
async function sendWhatsAppLocation(toNumber, lat, lng) {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${phoneId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: toNumber.replace('+', ''),
        type: 'location',
        location: {
          latitude: lat,
          longitude: lng,
          name: 'Emergency Location',
          address: `${lat}, ${lng}`
        }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error: ${error}`);
  }
  
  return await response.json();
}

module.exports = {
  sendWhatsAppAlert,
  sendWhatsAppMessage,
  sendWhatsAppLocation
};
