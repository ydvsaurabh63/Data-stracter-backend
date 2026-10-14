import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './config/db.js';
import { ensureDefaultAdmin } from './controllers/authController.js';
import { ensureDefaultClients } from './controllers/clientController.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import billRoutes from './routes/billRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import marketingRoutes from './routes/marketingRoutes.js';
import clientRoutes from './routes/clientRoutes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded bill photos statically
const uploadsPath = path.resolve('uploads');
app.use('/uploads', express.static(uploadsPath));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Restaurant Bill Extraction & Customer Loyalty CRM',
    timestamp: new Date(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/marketing', marketingRoutes);
app.use('/api/admin/clients', clientRoutes);

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('[Server Error]:', err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// Start Server and Connect DB
const startServer = async () => {
  await connectDB();
  await ensureDefaultAdmin();
  await ensureDefaultClients();

  app.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚀 Restaurant Bill Extraction & CRM Server Running!`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🔑 Default Admin: admin | Password: admin`);
    console.log(`📂 Uploads directory: ${uploadsPath}`);
    console.log(`=======================================================`);
  });
};

startServer();
