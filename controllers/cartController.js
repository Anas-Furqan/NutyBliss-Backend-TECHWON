const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get cart
exports.getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'title slug images basePrice baseDiscountPrice totalStock variants');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Calculate totals
    let subtotal = 0;
    const validItems = [];

    for (const item of cart.items) {
      if (item.product && item.product.isActive !== false) {
        const price = item.variant?.price || item.product.baseDiscountPrice || item.product.basePrice;
        subtotal += price * item.quantity;
        validItems.push({
          ...item.toObject(),
          price
        });
      }
    }

    res.json({
      success: true,
      cart: {
        items: validItems,
        subtotal,
        discount: cart.discount,
        couponCode: cart.couponCode,
        total: subtotal - cart.discount
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add to cart
exports.addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, variant } = req.body;

    const product = await Product.findById(productId);
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check stock
    let stockToCheck = product.totalStock;
    if (variant?.size) {
      const productVariant = product.variants.find(v => v.size === variant.size);
      if (productVariant) {
        stockToCheck = productVariant.stock;
      }
    }

    if (stockToCheck < quantity) {
      return res.status(400).json({
        success: false,
        message: 'Not enough stock available'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        user: req.user._id,
        items: [{ product: productId, quantity, variant }]
      });
    } else {
      // Check if product already in cart
      const existingItem = cart.items.find(
        item => item.product.toString() === productId &&
          JSON.stringify(item.variant) === JSON.stringify(variant)
      );

      if (existingItem) {
        existingItem.quantity += quantity;
      } else {
        cart.items.push({ product: productId, quantity, variant });
      }

      await cart.save();
    }

    await cart.populate('items.product', 'title slug images basePrice baseDiscountPrice totalStock variants');

    res.json({
      success: true,
      message: 'Product added to cart',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update cart item
exports.updateCartItem = async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    const item = cart.items.id(itemId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in cart'
      });
    }

    if (quantity <= 0) {
      cart.items.pull(itemId);
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    await cart.populate('items.product', 'title slug images basePrice baseDiscountPrice totalStock variants');

    res.json({
      success: true,
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove from cart
exports.removeFromCart = async (req, res) => {
  try {
    const { itemId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });

    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Cart not found'
      });
    }

    cart.items.pull(itemId);
    await cart.save();
    await cart.populate('items.product', 'title slug images basePrice baseDiscountPrice totalStock variants');

    res.json({
      success: true,
      message: 'Item removed from cart',
      cart
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Clear cart
exports.clearCart = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { items: [], discount: 0, couponCode: null }
    );

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Apply coupon
exports.applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;
    const Coupon = require('../models/Coupon');

    const coupon = await Coupon.findOne({ code: code.toUpperCase() });

    if (!coupon || !coupon.isValid()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired coupon code'
      });
    }

    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cart is empty'
      });
    }

    // Calculate subtotal
    let subtotal = 0;
    for (const item of cart.items) {
      const price = item.variant?.price || item.product.baseDiscountPrice || item.product.basePrice;
      subtotal += price * item.quantity;
    }

    const discount = coupon.calculateDiscount(subtotal);

    if (discount === 0) {
      return res.status(400).json({
        success: false,
        message: `Minimum order amount is Rs. ${coupon.minOrderAmount}`
      });
    }

    cart.couponCode = coupon.code;
    cart.discount = discount;
    await cart.save();

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      discount,
      couponCode: coupon.code
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Remove coupon
exports.removeCoupon = async (req, res) => {
  try {
    await Cart.findOneAndUpdate(
      { user: req.user._id },
      { couponCode: null, discount: 0 }
    );

    res.json({
      success: true,
      message: 'Coupon removed'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
