import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

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
    password: {
      type: String,
      default: '$2a$10$tZ2cIuA.h1w1u1bY1C7QzO1z4z7o/w9L1jL1/9Z1jL1/9Z1jL1/9Z', // default hashed password for client
    },
  },
  { timestamps: true }
);

// Compare password method
clientSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

export const Client = mongoose.model('Client', clientSchema);

