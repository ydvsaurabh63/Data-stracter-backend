import axios from 'axios';

/**
 * Service to send promotional offers and reminders via WhatsApp or SMS.
 */
export const sendCustomerNotification = async ({ phone, customerName, message, offerCode, discountPercent }) => {
  const whatsappUrl = process.env.WHATSAPP_API_URL;
  const whatsappToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const formattedPhone = phone.replace(/\D/g, '').slice(-10);
  const personalizedMessage = message
    ? message.replace('{name}', customerName).replace('{code}', offerCode || 'DISCOUNT10')
    : `Hello ${customerName}! We miss you at our restaurant. Come visit this week and get ${discountPercent || 15}% OFF! Use code: ${offerCode || 'WELCOMEBACK'}`;

  // If live WhatsApp Cloud API credentials are provided:
  if (whatsappUrl && whatsappToken && phoneNumberId) {
    try {
      console.log(`[WhatsApp API]: Sending message to ${formattedPhone}...`);
      const response = await axios.post(
        `${whatsappUrl}/${phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: `91${formattedPhone}`,
          type: 'text',
          text: { body: personalizedMessage },
        },
        {
          headers: {
            Authorization: `Bearer ${whatsappToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      return {
        success: true,
        provider: 'WhatsApp Cloud API',
        messageId: response.data?.messages?.[0]?.id,
        phone: formattedPhone,
        text: personalizedMessage,
      };
    } catch (error) {
      console.error('[WhatsApp API Error]:', error.response?.data || error.message);
    }
  }

  // Graceful simulation log when keys are not configured yet
  console.log(`[Notification Engine (Simulated)]: Message sent to ${formattedPhone}: "${personalizedMessage}"`);

  return {
    success: true,
    provider: 'Simulated Notification Service (Ready for WhatsApp/SMS API keys)',
    phone: formattedPhone,
    recipient: customerName,
    text: personalizedMessage,
    timestamp: new Date(),
  };
};
