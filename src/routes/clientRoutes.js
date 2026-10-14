import express from 'express';
import {
  getClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  getPlatformOverview,
} from '../controllers/clientController.js';

const router = express.Router();

router.get('/overview', getPlatformOverview);
router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClientById);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
