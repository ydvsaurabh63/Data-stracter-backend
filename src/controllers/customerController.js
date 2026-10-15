import { Customer } from '../models/Customer.js';
import { Bill } from '../models/Bill.js';

// @desc    Get all customers with advanced filters
// @route   GET /api/customers
export const getCustomers = async (req, res) => {
  try {
    const { search, filter, sortBy = 'lastVisit', order = 'desc', limit = 50, page = 1 } = req.query;
    const clientId = req.headers['x-client-id'] || req.query.clientId;
    const query = {};

    if (clientId) {
      query.client = clientId;
    }

    // Search by name or phone
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    // Dynamic Filter
    const now = new Date();
    if (filter === 'vip') {
      query.visitsCount = { $gte: 5 };
    } else if (filter === 'regular') {
      query.visitsCount = { $gte: 2, $lt: 5 };
    } else if (filter === 'new') {
      query.visitsCount = 1;
    } else if (filter === 'high_spender') {
      query.totalSpent = { $gte: 5000 };
    } else if (filter === 'inactive_30') {
      // Not visited in last 30 days
      const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
      query.lastVisit = { $lte: thirtyDaysAgo };
    } else if (filter === 'inactive_15') {
      // Not visited in last 15 days
      const fifteenDaysAgo = new Date(now.setDate(now.getDate() - 15));
      query.lastVisit = { $lte: fifteenDaysAgo };
    }

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const customers = await Customer.find(query)
      .sort(sortOptions)
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    const total = await Customer.countDocuments(query);

    res.json({
      success: true,
      data: customers,
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get customer details with their entire visit and bill history
// @route   GET /api/customers/:id
export const getCustomerDetails = async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Fetch all bills for this customer
    const bills = await Bill.find({ customer: customer._id }).sort({ billDate: -1 });

    res.json({
      success: true,
      data: {
        customer,
        bills,
        stats: {
          totalVisits: customer.visitsCount,
          totalSpent: customer.totalSpent,
          averageBill: customer.averageBillValue,
          firstVisit: customer.firstVisit || customer.createdAt,
          lastVisit: customer.lastVisit || customer.createdAt,
          daysSinceLastVisit: customer.lastVisit
            ? Math.floor((new Date() - new Date(customer.lastVisit)) / (1000 * 60 * 60 * 24))
            : 0,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer tags or notes
// @route   PUT /api/customers/:id
export const updateCustomer = async (req, res) => {
  try {
    const { name, notes, tags } = req.body;
    const customer = await Customer.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (name) customer.name = name;
    if (notes !== undefined) customer.notes = notes;
    if (tags && Array.isArray(tags)) customer.tags = tags;

    await customer.save();

    res.json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get retention dashboard analytics
// @route   GET /api/customers/analytics/overview
export const getAnalyticsOverview = async (req, res) => {
  try {
    const clientId = req.headers['x-client-id'] || req.query.clientId;
    const clientFilter = clientId ? { client: clientId } : {};

    const totalCustomers = await Customer.countDocuments(clientFilter);
    const repeatCustomers = await Customer.countDocuments({ ...clientFilter, visitsCount: { $gt: 1 } });
    const vipCustomers = await Customer.countDocuments({ ...clientFilter, visitsCount: { $gte: 5 } });

    // Inactive customers (no visit in > 20 days)
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
    const inactiveCustomers = await Customer.countDocuments({ ...clientFilter, lastVisit: { $lte: twentyDaysAgo } });

    // Total revenue and bills count
    const totalBills = await Bill.countDocuments(clientFilter);
    const revenueAgg = await Bill.aggregate([
      ...(clientId ? [{ $match: { client: new (await import('mongoose')).default.Types.ObjectId(clientId) } }] : []),
      { $group: { _id: null, total: { $sum: '$totalAmount' } } },
    ]);
    const totalRevenue = revenueAgg[0]?.total || 0;

    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;

    // Unique Customers list (1 record per unique phone number)
    const uniqueCustomers = await Customer.find(clientFilter)
      .sort({ lastVisit: -1 })
      .limit(100);

    // Recent bills breakdown
    const recentBills = await Bill.find(clientFilter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('customer', 'name phone visitsCount totalSpent');

    res.json({
      success: true,
      data: {
        totalCustomers,
        repeatCustomers,
        repeatRate,
        vipCustomers,
        inactiveCustomers,
        totalBills,
        totalRevenue,
        recentBills,
        uniqueCustomers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
