import express from 'express';
import { broadcastOffer, getOfferTemplates } from '../controllers/marketingController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send-offer', protect, broadcastOffer);
router.get('/templates', protect, getOfferTemplates);

export default router;
