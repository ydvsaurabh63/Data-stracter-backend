import express from 'express';
import {
  scanAndExtractBill,
  confirmAndSaveBill,
  getAllBills,
  getBillById,
} from '../controllers/billController.js';
import { upload } from '../middleware/uploadMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Camera photo upload & LandingAI extraction endpoint
router.post('/extract', protect, upload.single('billImage'), scanAndExtractBill);

// Confirm & save bill to database & increment visit
router.post('/confirm', protect, confirmAndSaveBill);

// View bill records
router.get('/', protect, getAllBills);
router.get('/:id', protect, getBillById);

export default router;
