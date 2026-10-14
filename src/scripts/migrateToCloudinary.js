import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { Bill } from '../models/Bill.js';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
  api_key: process.env.CLOUDINARY_API_KEY.trim(),
  api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
});

const migrate = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB Connected.');

    const bills = await Bill.find({
      billImageUrl: { $regex: /uploads\//i },
    });

    console.log(`Found ${bills.length} bills with local image URLs.`);

    const uploadsDir = path.resolve('uploads');
    let migratedCount = 0;

    for (const bill of bills) {
      try {
        const filename = bill.billImageUrl.split('/uploads/').pop();
        const filePath = path.join(uploadsDir, filename);

        if (fs.existsSync(filePath)) {
          console.log(`Uploading ${filename} for bill ${bill.billNumber}...`);
          const uploadRes = await cloudinary.uploader.upload(filePath, {
            folder: 'restaurant_bills',
            resource_type: 'image',
          });

          bill.billImageUrl = uploadRes.secure_url;
          await bill.save();
          migratedCount++;
          console.log(`✓ Migrated ${bill.billNumber} -> ${uploadRes.secure_url}`);
        } else {
          console.warn(`File not found on disk: ${filePath}`);
        }
      } catch (err) {
        console.error(`Error migrating bill ${bill.billNumber}:`, err.message);
      }
    }

    console.log(`\n🎉 Migration Complete: ${migratedCount} / ${bills.length} bills migrated to Cloudinary!`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

migrate();
