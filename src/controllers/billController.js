import { Bill } from '../models/Bill.js';
import { Customer } from '../models/Customer.js';
import { extractBillWithGemini } from '../services/geminiVisionService.js';
import { extractBillDataWithLandingAI } from '../services/landingAiService.js';
import { uploadBillImage } from '../services/storageService.js';

// @desc    Upload bill photo and extract data via Gemini Vision AI
// @route   POST /api/bills/extract
export const scanAndExtractBill = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload or capture a bill photo' });
    }

    // 1. Upload/store bill image
    const storageResult = await uploadBillImage(req.file, req);

    // 2. Extract data via Google Gemini Vision AI (with fallback)
    let extractionResult;
    if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '') {
      try {
        console.log('[Bill Controller]: Extracting receipt data with Google Gemini Vision...');
        extractionResult = await extractBillWithGemini(req.file.path);
      } catch (geminiErr) {
        console.warn('[Gemini Vision Failed, falling back]:', geminiErr.message);
        extractionResult = await extractBillDataWithLandingAI(req.file.path);
      }
    } else {
      extractionResult = await extractBillDataWithLandingAI(req.file.path);
    }

    // 3. Check if customer already exists in DB
    let existingCustomer = null;
    const cleanPhone = extractionResult.customerPhone ? extractionResult.customerPhone.slice(-10) : '';

    const clientId = req.headers['x-client-id'] || req.body?.clientId;
    if (cleanPhone) {
      const matchQuery = { phone: cleanPhone };
      if (clientId) matchQuery.client = clientId;
      existingCustomer = await Customer.findOne(matchQuery);
    }

    res.json({
      success: true,
      data: {
        billImageUrl: storageResult.url,
        extracted: {
          customerName: existingCustomer ? existingCustomer.name : extractionResult.customerName,
          customerPhone: cleanPhone,
          items: extractionResult.items || [],
          subtotal: extractionResult.subtotal || extractionResult.totalAmount,
          tax: extractionResult.tax || 0,
          totalAmount: extractionResult.totalAmount || 0,
          billDate: extractionResult.billDate || new Date(),
        },
        customerMatch: {
          isExisting: !!existingCustomer,
          previousVisits: existingCustomer ? existingCustomer.visitsCount : 0,
          previousTotalSpent: existingCustomer ? existingCustomer.totalSpent : 0,
          lastVisit: existingCustomer ? existingCustomer.lastVisit : null,
          tags: existingCustomer ? existingCustomer.tags : [],
        },
        rawExtraction: extractionResult.raw || {},
        source: extractionResult.source,
      },
    });
  } catch (error) {
    console.error('[Bill Extraction Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Confirm and save bill & update customer visits
// @route   POST /api/bills/confirm
export const confirmAndSaveBill = async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      totalAmount,
      subtotal,
      tax,
      items,
      billImageUrl,
      paymentMethod,
      billDate,
      notes,
    } = req.body;

    if (!customerPhone || !totalAmount) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone and total amount are required to record bill',
      });
    }

    const clientId = req.headers['x-client-id'] || req.body.clientId;
    const cleanPhone = customerPhone.replace(/\D/g, '').slice(-10);
    const amountNum = Number(totalAmount);

    // 1. Find or create Customer (Strictly unique by phone number)
    const custQuery = { phone: cleanPhone };
    if (clientId) custQuery.client = clientId;
    let customer = await Customer.findOne(custQuery);

    // Fallback: If not found under clientId, match existing customer with this phone
    if (!customer) {
      customer = await Customer.findOne({ phone: cleanPhone });
      if (customer && clientId && !customer.client) {
        customer.client = clientId;
      }
    }
    let isNewCustomer = false;

    if (customer) {
      // Existing customer: add visit, accumulate total spend, and append dishes
      customer.recordVisit(amountNum, items);
      if (customerName && customerName.trim() && !['Walk-in Customer', 'Guest Customer'].includes(customerName.trim())) {
        customer.name = customerName.trim();
      }
      await customer.save();
    } else {
      // New customer: create strictly unique record and record first visit
      try {
        isNewCustomer = true;
        customer = new Customer({
          client: clientId || undefined,
          name: customerName && customerName.trim() ? customerName.trim() : 'Guest Customer',
          phone: cleanPhone,
          visitsCount: 0,
          totalSpent: 0,
          averageBillValue: 0,
          firstVisit: billDate ? new Date(billDate) : new Date(),
          notes: notes || '',
          tags: ['New'],
        });
        customer.recordVisit(amountNum, items);
        await customer.save();
      } catch (saveErr) {
        // If race condition or duplicate key, safely retrieve existing customer
        if (saveErr.code === 11000 || saveErr.message?.includes('duplicate key')) {
          customer = await Customer.findOne({ phone: cleanPhone });
          if (customer) {
            customer.recordVisit(amountNum, items);
            await customer.save();
            isNewCustomer = false;
          } else {
            throw saveErr;
          }
        } else {
          throw saveErr;
        }
      }
    }

    // 2. Save Bill Record linked to customer & client
    const bill = await Bill.create({
      client: clientId || undefined,
      customer: customer._id,
      customerName: customer.name,
      customerPhone: cleanPhone,
      billImageUrl: billImageUrl || '',
      items: items || [],
      subtotal: Number(subtotal) || amountNum,
      tax: Number(tax) || 0,
      totalAmount: amountNum,
      paymentMethod: paymentMethod || 'Cash',
      billDate: billDate ? new Date(billDate) : new Date(),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: isNewCustomer
        ? `New customer created! (Visit #1 recorded)`
        : `Customer updated! (Now at ${customer.visitsCount} visits)`,
      data: {
        bill,
        customer: {
          _id: customer._id,
          name: customer.name,
          phone: customer.phone,
          visitsCount: customer.visitsCount,
          totalSpent: customer.totalSpent,
          averageBillValue: customer.averageBillValue,
          lastVisit: customer.lastVisit,
          tags: customer.tags,
          isNew: isNewCustomer,
        },
      },
    });
  } catch (error) {
    console.error('[Bill Save Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all recorded bills
// @route   GET /api/bills
export const getAllBills = async (req, res) => {
  try {
    const { search, limit = 50, page = 1 } = req.query;
    const clientId = req.headers['x-client-id'] || req.query.clientId;
    const query = {};

    if (clientId) {
      query.client = clientId;
    }

    if (search) {
      query.$or = [
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { billNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const bills = await Bill.find(query)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .populate('customer', 'name phone visitsCount totalSpent');

    const total = await Bill.countDocuments(query);

    res.json({
      success: true,
      data: bills,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get bill by ID
// @route   GET /api/bills/:id
export const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id).populate('customer');
    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }
    res.json({ success: true, data: bill });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
