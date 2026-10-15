import { Client } from '../models/Client.js';
import { Bill } from '../models/Bill.js';
import { Customer } from '../models/Customer.js';

// @desc    Get all clients with computed stats (bills count, revenue, customer count)
// @route   GET /api/admin/clients
export const getClients = async (req, res) => {
  try {
    const clients = await Client.find().sort({ createdAt: -1 });

    const clientsWithStats = await Promise.all(
      clients.map(async (client) => {
        const [billsCount, revenueResult, customersCount] = await Promise.all([
          Bill.countDocuments({ client: client._id }),
          Bill.aggregate([
            { $match: { client: client._id } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } },
          ]),
          Customer.countDocuments({ client: client._id }),
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

        return {
          ...client.toObject(),
          billsCount,
          totalRevenue,
          customersCount,
        };
      })
    );

    res.json({
      success: true,
      data: clientsWithStats,
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single client by ID
// @route   GET /api/admin/clients/:id
export const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    const [billsCount, revenueResult, customersCount] = await Promise.all([
      Bill.countDocuments({ client: client._id }),
      Bill.aggregate([
        { $match: { client: client._id } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Customer.countDocuments({ client: client._id }),
    ]);

    const totalRevenue = revenueResult.length > 0 ? revenueResult[0].total : 0;

    res.json({
      success: true,
      data: {
        ...client.toObject(),
        billsCount,
        totalRevenue,
        customersCount,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create a new client / restaurant
// @route   POST /api/admin/clients
export const createClient = async (req, res) => {
  try {
    const { name, ownerName, email, phone, password, category, plan, status, address, notes } = req.body;

    if (!name || !ownerName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Name, Owner Name, Email, and Phone are required',
      });
    }

    if (!password || !password.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Client login password is required',
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Please select a Business Category',
      });
    }

    const existing = await Client.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A client with this email already exists',
      });
    }

    const client = await Client.create({
      name: name.trim(),
      ownerName: ownerName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password: password.trim(),
      category: category || 'Restaurant',
      plan: plan || 'Pro',
      status: status || 'active',
      address: address || '',
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: `Client "${client.name}" created successfully!`,
      data: {
        ...client.toObject(),
        billsCount: 0,
        totalRevenue: 0,
        customersCount: 0,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update client details
// @route   PUT /api/admin/clients/:id
export const updateClient = async (req, res) => {
  try {
    const { name, ownerName, email, phone, password, category, plan, status, address, notes } = req.body;

    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    if (email && email.toLowerCase().trim() !== client.email) {
      const existing = await Client.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: client._id },
      });
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another client with this email already exists',
        });
      }
      client.email = email.toLowerCase().trim();
    }

    if (name) client.name = name.trim();
    if (ownerName) client.ownerName = ownerName.trim();
    if (phone) client.phone = phone.trim();
    if (password && password.trim().length > 0) client.password = password.trim();
    if (category) client.category = category;
    if (plan) client.plan = plan;
    if (status) client.status = status;
    if (address !== undefined) client.address = address;
    if (notes !== undefined) client.notes = notes;

    await client.save();

    res.json({
      success: true,
      message: 'Client updated successfully',
      data: client,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete client
// @route   DELETE /api/admin/clients/:id
export const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Optional: Clean up client's bills & customers
    await Promise.all([
      Bill.deleteMany({ client: client._id }),
      Customer.deleteMany({ client: client._id }),
      client.deleteOne(),
    ]);

    res.json({
      success: true,
      message: `Client "${client.name}" and all associated data deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Platform Master Overview KPIs across all clients
// @route   GET /api/admin/overview
export const getPlatformOverview = async (req, res) => {
  try {
    const [totalClients, activeClients, totalBills, revenueAgg, totalCustomers] = await Promise.all([
      Client.countDocuments(),
      Client.countDocuments({ status: 'active' }),
      Bill.countDocuments(),
      Bill.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Customer.countDocuments(),
    ]);

    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    res.json({
      success: true,
      data: {
        totalClients,
        activeClients,
        totalBills,
        totalRevenue,
        totalCustomers,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Ensure default client exists and link legacy bills/customers
export const ensureDefaultClients = async () => {
  try {
    let defaultClient = await Client.findOne();

    if (!defaultClient) {
      defaultClient = await Client.create({
        name: 'Grand Spice Bistro',
        ownerName: 'Rahul Sharma',
        email: 'owner@grandspice.com',
        phone: '9876543210',
        plan: 'Pro',
        status: 'active',
        address: 'Connaught Place, New Delhi',
        notes: 'Primary Default Restaurant Client',
      });
      console.log(`[Multi-tenant]: Created default client "${defaultClient.name}" (${defaultClient._id})`);
    }

    // Attach any unassigned bills to default client
    const billsUpdated = await Bill.updateMany(
      { $or: [{ client: { $exists: false } }, { client: null }] },
      { $set: { client: defaultClient._id } }
    );
    if (billsUpdated.modifiedCount > 0) {
      console.log(`[Multi-tenant]: Attached ${billsUpdated.modifiedCount} legacy bills to default client.`);
    }

    // Attach any unassigned customers to default client
    const customersUpdated = await Customer.updateMany(
      { $or: [{ client: { $exists: false } }, { client: null }] },
      { $set: { client: defaultClient._id } }
    );
    if (customersUpdated.modifiedCount > 0) {
      console.log(`[Multi-tenant]: Attached ${customersUpdated.modifiedCount} legacy customers to default client.`);
    }
  } catch (err) {
    console.error('[Multi-tenant Setup Error]:', err.message);
  }
};
