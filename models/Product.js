const mongoose = require('mongoose');

const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  discountPrice: {
    type: Number
  },
  stock: {
    type: Number,
    default: 0
  },
  sku: {
    type: String
  }
});

const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  shortDescription: {
    type: String
  },
  images: [{
    url: { type: String, required: true },
    alt: { type: String }
  }],
  category: {
    type: String,
    required: true,
    enum: ['peanut-butter', 'oats', 'bundles', 'accessories']
  },
  variants: [variantSchema],
  basePrice: {
    type: Number,
    required: true
  },
  baseDiscountPrice: {
    type: Number
  },
  totalStock: {
    type: Number,
    default: 0
  },
  rating: {
    average: { type: Number, default: 0 },
    count: { type: Number, default: 0 }
  },
  tags: [String],
  ingredients: [String],
  nutritionFacts: {
    servingSize: String,
    calories: Number,
    protein: Number,
    carbs: Number,
    fat: Number,
    fiber: Number
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isHotSelling: {
    type: Boolean,
    default: false
  },
  isNewArrival: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Create slug from title before saving
productSchema.pre('save', function(next) {
  if (this.isModified('title')) {
    this.slug = this.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  // Calculate total stock
  if (this.variants && this.variants.length > 0) {
    this.totalStock = this.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
  }
  next();
});

// Virtual for checking if in stock
productSchema.virtual('inStock').get(function() {
  return this.totalStock > 0;
});

// Index for search
productSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Product', productSchema);
