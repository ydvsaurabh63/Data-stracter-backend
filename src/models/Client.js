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
    password: {
      type: String,
      default: 'client123',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Restaurant',
        'Cafe',
        'Garments & Fashion',
        'Hardware & Sanitary',
        'Electronics & Mobile',
        'Grocery & Supermarket',
        'General Retail Store',
      ],
      default: 'Restaurant',
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

// Encrypt password before saving
clientSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
clientSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export const Client = mongoose.model('Client', clientSchema);
