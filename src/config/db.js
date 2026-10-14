import mongoose from 'mongoose';
import dns from 'dns';

// Ensure reliable SRV DNS resolution for MongoDB Atlas on Windows
try {
  dns.setServers(['8.8.8.8', '8.8.4.4']);
} catch (e) {
  // Ignore if not permitted
}

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/restaurant_bills');
    console.log(`[MongoDB Connected]: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    console.log('Notice: Make sure MongoDB service is running (or provide a remote MongoDB URI in .env)');
  }
};
