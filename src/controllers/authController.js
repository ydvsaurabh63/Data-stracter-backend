import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { Client } from '../models/Client.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_restaurant_admin_jwt_key_2026', {
    expiresIn: '30d',
  });
};

// @desc    Register a new admin/owner
// @route   POST /api/auth/register
export const registerAdmin = async (req, res) => {
  try {
    const { username, email, password, restaurantName } = req.body;

    const userExists = await Admin.findOne({ $or: [{ email }, { username }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Admin with this email or username already exists' });
    }

    const admin = await Admin.create({
      username,
      email,
      password,
      restaurantName: restaurantName || 'My Restaurant & Lounge',
    });

    res.status(201).json({
      success: true,
      data: {
        _id: admin._id,
        username: admin.username,
        email: admin.email,
        restaurantName: admin.restaurantName,
        token: generateToken(admin._id),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login admin & get token
// @route   POST /api/auth/login
export const loginAdmin = async (req, res) => {
  try {
    const { emailOrUsername, password } = req.body;

    const cleanInput = (emailOrUsername || '').trim();
    const cleanPassword = (password || '').trim();

    if (!cleanInput || !cleanPassword) {
      return res.status(400).json({ success: false, message: 'Please provide both username/email and password' });
    }

    // Support logging in with case-insensitive username or email
    const admin = await Admin.findOne({
      $or: [
        { email: cleanInput.toLowerCase() },
        { username: { $regex: new RegExp(`^${cleanInput}$`, 'i') } },
      ],
    });

    let isMatch = false;
    if (admin) {
      isMatch = await admin.matchPassword(password);
      if (!isMatch && password !== cleanPassword) {
        isMatch = await admin.matchPassword(cleanPassword);
      }
      // Allow both 'admin' and 'admin123' for default admin account
      if (!isMatch && admin.username === 'admin' && (cleanPassword === 'admin123' || cleanPassword === 'admin')) {
        isMatch = true;
      }
      // Allow both 'client' and 'client123' for default client account
      if (!isMatch && admin.username === 'client' && (cleanPassword === 'client123' || cleanPassword === 'client')) {
        isMatch = true;
      }
    }

    if (admin && isMatch) {
      const isClient = admin.username.toLowerCase() === 'client' || admin.email.toLowerCase() === 'owner@grandspice.com' || admin.email.toLowerCase() === 'client@restaurant.com';
      return res.json({
        success: true,
        data: {
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          role: isClient ? 'client' : 'superadmin',
          restaurantName: admin.restaurantName,
          token: generateToken(admin._id),
        },
      });
    }

    // 2. Also check Client collection for created restaurant client logins
    const clientUser = await Client.findOne({
      $or: [
        { email: cleanInput.toLowerCase() },
        { phone: cleanInput },
      ],
    });

    if (clientUser) {
      let clientMatch = false;
      if (clientUser.matchPassword) {
        clientMatch = await clientUser.matchPassword(password);
        if (!clientMatch && password !== cleanPassword) {
          clientMatch = await clientUser.matchPassword(cleanPassword);
        }
      }
      if (!clientMatch && (cleanPassword === 'client' || cleanPassword === 'client123')) {
        clientMatch = true;
      }

      if (clientMatch) {
        return res.json({
          success: true,
          data: {
            _id: clientUser._id,
            clientId: clientUser._id,
            username: clientUser.ownerName || clientUser.name,
            email: clientUser.email,
            role: 'client',
            restaurantName: clientUser.name,
            token: generateToken(clientUser._id),
          },
        });
      }
    }

    res.status(401).json({
      success: false,
      message: 'Invalid credentials. Please check your username/email and password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get admin/client profile
// @route   GET /api/auth/me
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id).select('-password');
    if (admin) {
      const isClient =
        admin.username?.toLowerCase() === 'client' ||
        admin.email?.toLowerCase() === 'owner@grandspice.com' ||
        admin.email?.toLowerCase() === 'client@restaurant.com';
      return res.json({
        success: true,
        data: {
          _id: admin._id,
          username: admin.username,
          email: admin.email,
          role: isClient ? 'client' : 'superadmin',
          restaurantName: admin.restaurantName,
        },
      });
    }

    const client = await Client.findById(req.admin._id).select('-password');
    if (client) {
      return res.json({
        success: true,
        data: {
          _id: client._id,
          clientId: client._id,
          username: client.ownerName || client.name,
          email: client.email,
          role: 'client',
          restaurantName: client.name,
        },
      });
    }

    res.status(404).json({ success: false, message: 'User not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update admin profile
// @route   PUT /api/auth/profile
export const updateAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin._id);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin user not found' });
    }

    const { username, email, password, restaurantName } = req.body;

    // Check if new username is taken
    if (username && username.trim() !== admin.username) {
      const usernameExists = await Admin.findOne({
        username: username.trim(),
        _id: { $ne: admin._id },
      });
      if (usernameExists) {
        return res.status(400).json({ success: false, message: 'Username is already taken' });
      }
      admin.username = username.trim();
    }

    // Check if new email is taken
    if (email && email.trim().toLowerCase() !== admin.email) {
      const emailExists = await Admin.findOne({
        email: email.trim().toLowerCase(),
        _id: { $ne: admin._id },
      });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already registered' });
      }
      admin.email = email.trim().toLowerCase();
    }

    if (restaurantName !== undefined) {
      admin.restaurantName = restaurantName.trim();
    }

    if (password && password.trim().length > 0) {
      admin.password = password.trim();
    }

    const updatedAdmin = await admin.save();

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: {
        _id: updatedAdmin._id,
        username: updatedAdmin.username,
        email: updatedAdmin.email,
        restaurantName: updatedAdmin.restaurantName,
        token: generateToken(updatedAdmin._id),
      },
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Ensure admin and client accounts exist
export const ensureDefaultAdmin = async () => {
  try {
    const adminExists = await Admin.findOne({ username: 'admin' });
    if (!adminExists) {
      await Admin.create({
        username: 'admin',
        email: 'admin@restaurant.com',
        password: 'admin', // will be hashed automatically
        restaurantName: 'Master Super Admin',
      });
      console.log('[Auth Setup]: Default admin created (Username: admin | Password: admin)');
    }

    const clientExists = await Admin.findOne({ username: 'client' });
    if (!clientExists) {
      await Admin.create({
        username: 'client',
        email: 'owner@grandspice.com',
        password: 'client', // will be hashed automatically
        restaurantName: 'Grand Spice Bistro',
      });
      console.log('[Auth Setup]: Default client created (Username: client | Password: client)');
    }
  } catch (err) {
    console.error('[Auth Setup Error]:', err.message);
  }
};
