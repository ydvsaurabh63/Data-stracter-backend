import { Customer } from '../models/Customer.js';
import { sendCustomerNotification } from '../services/notificationService.js';

// @desc    Broadcast offer to selected or filtered customers
// @route   POST /api/marketing/send-offer
export const broadcastOffer = async (req, res) => {
  try {
    const { customerIds, targetGroup, message, offerCode, discountPercent } = req.body;
    const activeClientId = req.headers['x-client-id'] || req.admin?.clientId;
    const baseQuery = {};
    if (activeClientId) {
      baseQuery.client = activeClientId;
    }

    let targetCustomers = [];

    if (Array.isArray(customerIds) && customerIds.length > 0) {
      targetCustomers = await Customer.find({ ...baseQuery, _id: { $in: customerIds } });
    } else if (targetGroup) {
      const now = new Date();
      if (targetGroup === 'inactive') {
        const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000);
        targetCustomers = await Customer.find({ ...baseQuery, lastVisit: { $lte: twentyDaysAgo } });
      } else if (targetGroup === 'vip') {
        targetCustomers = await Customer.find({ ...baseQuery, visitsCount: { $gte: 5 } });
      } else if (targetGroup === 'all') {
        targetCustomers = await Customer.find(baseQuery);
      }
    }

    if (targetCustomers.length === 0) {
      let groupName = 'Registered';
      if (targetGroup === 'inactive') groupName = 'Inactive (> 20 days)';
      else if (targetGroup === 'vip') groupName = 'VIP Regular (5+ visits)';

      return res.status(200).json({
        success: false,
        count: 0,
        message: `Is group (${groupName}) me abhi koi customer nahi hai. Pehle bill scan karke customer add karein ya "All Registered Customers" select karein.`,
      });
    }

    // Send notifications
    const results = [];
    for (const cust of targetCustomers) {
      const resLog = await sendCustomerNotification({
        phone: cust.phone,
        customerName: cust.name,
        message,
        offerCode: offerCode || 'FEAST15',
        discountPercent: discountPercent || 15,
      });
      results.push(resLog);
    }

    res.json({
      success: true,
      message: `Offer dispatched successfully to ${results.length} customer(s)!`,
      count: results.length,
      logs: results,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get popular retention offer templates
// @route   GET /api/marketing/templates
export const getOfferTemplates = async (req, res) => {
  const templates = [
    {
      id: 'inactive_reengage',
      title: 'We Miss You! (Re-engagement)',
      target: 'inactive',
      discountPercent: 15,
      offerCode: 'MISSYOU15',
      message: 'Hello {name}! It has been a while since your last visit. Treat yourself this week and enjoy 15% OFF your entire bill with code {code}!',
    },
    {
      id: 'vip_appreciation',
      title: 'VIP Loyalty Reward (Free Dessert)',
      target: 'vip',
      discountPercent: 20,
      offerCode: 'VIPDESSERT',
      message: 'Dear {name}, thank you for being our valued regular guest! On your next visit, enjoy a complimentary Chef Special Dessert on us. Code: {code}',
    },
    {
      id: 'weekend_special',
      title: 'Weekend Family Dining Offer',
      target: 'all',
      discountPercent: 10,
      offerCode: 'WEEKEND10',
      message: 'Hello {name}! Join us this weekend with friends and family to savor our newest dishes and get 10% OFF on bills over ₹1000. Code: {code}',
    },
  ];

  res.json({ success: true, data: templates });
};
