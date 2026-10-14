import express from 'express';
import {
  getCustomers,
  getCustomerDetails,
  updateCustomer,
  getAnalyticsOverview,
} from '../controllers/customerController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getCustomers);
router.get('/analytics/overview', protect, getAnalyticsOverview);
router.get('/:id', protect, getCustomerDetails);
router.put('/:id', protect, updateCustomer);

export default router;
