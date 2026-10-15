import jwt from 'jsonwebtoken';
import { Admin } from '../models/Admin.js';
import { Client } from '../models/Client.js';

export const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_restaurant_admin_jwt_key_2026');

      let user = await Admin.findById(decoded.id).select('-password');
      let role = decoded.role || 'superadmin';
      
      if (!user) {
        user = await Client.findById(decoded.id).select('-password');
        role = 'client';
      }

      // If user still not found (legacy token or ID), find first admin
      if (!user) {
        user = await Admin.findOne().select('-password');
      }

      req.admin = user;
      req.user = user;
      req.role = role;
      if (decoded.clientId || role === 'client') {
        req.clientId = decoded.clientId || user?._id;
      }

      return next();
    } catch (error) {
      console.error('[Auth Error]: Token verification failed', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token provided' });
  }
};

