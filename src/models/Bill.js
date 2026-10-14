import mongoose from 'mongoose';

const billItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    qty: { type: Number, default: 1 },
    price: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
  },
  { _id: false }
);

const billSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    customerPhone: {
      type: String,
      required: true,
      index: true,
    },
    billNumber: {
      type: String,
      default: () => 'BILL-' + Date.now().toString().slice(-6),
    },
    billImageUrl: {
      type: String,
      default: '',
    },
    items: [billItemSchema],
    subtotal: {
      type: Number,
      default: 0,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Card', 'Other'],
      default: 'Cash',
    },
    billDate: {
      type: Date,
      default: Date.now,
    },
    rawExtraction: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    extractionMethod: {
      type: String,
      default: 'LandingAI',
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

export const Bill = mongoose.model('Bill', billSchema);
