const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    size: String,
    price: Number
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  couponCode: String,
  discount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calculate totals
cartSchema.methods.calculateTotals = async function() {
  await this.populate('items.product');

  let subtotal = 0;
  for (const item of this.items) {
    const price = item.variant?.price || item.product.baseDiscountPrice || item.product.basePrice;
    subtotal += price * item.quantity;
  }

  return {
    subtotal,
    discount: this.discount,
    total: subtotal - this.discount
  };
};

module.exports = mongoose.model('Cart', cartSchema);
