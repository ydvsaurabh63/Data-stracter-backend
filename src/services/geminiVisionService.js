import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

/**
 * Extract physical/digital bill details from image using Google Gemini Vision
 */
export const extractBillWithGemini = async (filePath) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('GEMINI_API_KEY is missing in backend .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Supported fast vision model: gemini-3.5-flash-lite or gemini-3.5-flash
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash-lite' });

  // Read image file into base64 inline part
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  
  // Detect mime type from file path extension
  let mimeType = 'image/jpeg';
  if (filePath.endsWith('.png')) mimeType = 'image/png';
  else if (filePath.endsWith('.webp')) mimeType = 'image/webp';

  const imagePart = {
    inlineData: {
      data: base64Data,
      mimeType,
    },
  };

  const prompt = `You are a professional restaurant bill and receipt parser. 
Carefully examine this restaurant receipt/bill image and extract the following details accurately:

1. customerName: Name of the customer if printed/written on the bill. If absent, set to "Walk-in Customer".
2. customerPhone: Customer's 10-digit mobile phone number (look for phone, mobile, contact, ph, tel, or any 10-digit sequence). If found, format as pure 10 digits without spaces or country code. If absent, set to "".
3. items: Array of dishes ordered. Each item must have:
   - name: String (dish name)
   - qty: Number (default 1)
   - price: Number (unit price)
   - amount: Number (qty * price)
4. subtotal: Total of dishes before tax (Number)
5. tax: Total GST / VAT / Service Tax amount (Number, default 0)
6. totalAmount: Grand Total to pay (Number). This is required.
7. billDate: Date on the receipt in YYYY-MM-DD format (if absent, use current date).

CRITICAL REQUIREMENT:
Output ONLY a valid JSON object without any markdown wrapping (no \`\`\`json or \`\`\`), no extra text or explanations.
JSON structure:
{
  "customerName": "...",
  "customerPhone": "...",
  "items": [
    { "name": "...", "qty": 1, "price": 100, "amount": 100 }
  ],
  "subtotal": 100,
  "tax": 5,
  "totalAmount": 105,
  "billDate": "2026-10-14"
}`;

  console.log('[Gemini Vision]: Sending bill image to Gemini 3.5 Flash...');
  const result = await model.generateContent([prompt, imagePart]);
  const responseText = result.response.text().trim();
  console.log('[Gemini Vision Response]:', responseText);

  // Clean any markdown formatting if present
  let cleanJson = responseText;
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
  }

  let parsed = {};
  try {
    parsed = JSON.parse(cleanJson);
  } catch (parseErr) {
    console.error('[Gemini Vision JSON Parse Error]:', parseErr.message, 'Raw was:', responseText);
    // Fallback regex extraction if JSON syntax is slightly malformed
    const phoneMatch = responseText.match(/\b[6-9]\d{9}\b/);
    const amountMatch = responseText.match(/(?:total|amount|grand total)[\s:]*₹?\s*(\d+(?:\.\d+)?)/i);
    parsed = {
      customerName: 'Walk-in Customer',
      customerPhone: phoneMatch ? phoneMatch[0] : '',
      totalAmount: amountMatch ? Number(amountMatch[1]) : 0,
      items: [],
      subtotal: 0,
      tax: 0,
      billDate: new Date().toISOString().split('T')[0],
    };
  }

  // Format clean phone
  const cleanPhone = parsed.customerPhone ? String(parsed.customerPhone).replace(/\D/g, '').slice(-10) : '';

  return {
    success: true,
    source: 'Google Gemini Vision AI',
    customerName: (parsed.customerName || 'Walk-in Customer').trim(),
    customerPhone: cleanPhone,
    totalAmount: Number(parsed.totalAmount || parsed.subtotal || 0),
    subtotal: Number(parsed.subtotal || parsed.totalAmount || 0),
    tax: Number(parsed.tax || 0),
    items: Array.isArray(parsed.items) ? parsed.items.map(it => ({
      name: it.name || 'Dish Item',
      qty: Number(it.qty || it.quantity || 1),
      price: Number(it.price || it.rate || 0),
      amount: Number(it.amount || (Number(it.qty || 1) * Number(it.price || 0))),
    })) : [],
    billDate: parsed.billDate ? new Date(parsed.billDate) : new Date(),
    raw: parsed,
  };
};
