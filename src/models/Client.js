import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    ownerName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['Starter', 'Pro', 'Enterprise'],
      default: 'Pro',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'trial'],
      default: 'active',
    },
    address: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const Client = mongoose.model('Client', clientSchema);
