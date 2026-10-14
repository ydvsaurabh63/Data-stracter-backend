import mongoose from 'mongoose';

const customerSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    visitsCount: {
      type: Number,
      default: 1,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    averageBillValue: {
      type: Number,
      default: 0,
    },
    firstVisit: {
      type: Date,
      default: Date.now,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    favoriteDishes: [
      {
        name: String,
        count: { type: Number, default: 1 },
      },
    ],
    tags: [
      {
        type: String, // 'VIP', 'Regular', 'Inactive', 'High Spender'
      },
    ],
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

// Pre-validate hook: strictly clean phone number to 10 digits
customerSchema.pre('validate', function () {
  if (this.phone) {
    this.phone = this.phone.replace(/\D/g, '').slice(-10);
  }
});

// Enforce strictly unique customer phone number in the database
customerSchema.index({ phone: 1 }, { unique: true });

// Method to recalculate metrics based on new bill
customerSchema.methods.recordVisit = function (billAmount, items = []) {
  this.visitsCount += 1;
  this.totalSpent += billAmount;
  this.averageBillValue = Math.round(this.totalSpent / this.visitsCount);
  this.lastVisit = new Date();

  // Track favorite dishes
  if (Array.isArray(items)) {
    items.forEach((item) => {
      if (!item.name) return;
      const cleanName = item.name.trim();
      const existing = this.favoriteDishes.find(
        (d) => d.name.toLowerCase() === cleanName.toLowerCase()
      );
      if (existing) {
        existing.count += item.qty || 1;
      } else {
        this.favoriteDishes.push({ name: cleanName, count: item.qty || 1 });
      }
    });
    // Sort favorite dishes by count descending
    this.favoriteDishes.sort((a, b) => b.count - a.count);
  }

  // Update dynamic tags
  const tagsSet = new Set(this.tags);
  if (this.visitsCount >= 5) {
    tagsSet.add('VIP');
  } else if (this.visitsCount >= 2) {
    tagsSet.add('Regular');
  }

  if (this.totalSpent >= 5000) {
    tagsSet.add('High Spender');
  }

  // Remove Inactive tag since they just visited
  tagsSet.delete('Inactive');
  this.tags = Array.from(tagsSet);
};

export const Customer = mongoose.model('Customer', customerSchema);
