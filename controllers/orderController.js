const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');

// Create order
exports.createOrder = async (req, res) => {
  try {
    const {
      items,
      shippingAddress,
      paymentMethod,
      couponCode
    } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No items in order'
      });
    }

    // Validate and calculate order
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product || !product.isActive) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.productId}`
        });
      }

      let price = product.baseDiscountPrice || product.basePrice;
      let variantData = null;

      if (item.variant?.size) {
        const variant = product.variants.find(v => v.size === item.variant.size);
        if (variant) {
          price = variant.discountPrice || variant.price;
          variantData = { size: variant.size, price };

          // Check stock
          if (variant.stock < item.quantity) {
            return res.status(400).json({
              success: false,
              message: `Not enough stock for ${product.title} (${variant.size})`
            });
          }
        }
      }

      orderItems.push({
        product: product._id,
        title: product.title,
        image: product.images[0]?.url,
        variant: variantData,
        quantity: item.quantity,
        price: price * item.quantity
      });

      subtotal += price * item.quantity;
    }

    // Apply coupon if provided
    let discount = 0;
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      if (coupon && coupon.isValid()) {
        discount = coupon.calculateDiscount(subtotal);
        coupon.usedCount += 1;
        await coupon.save();
      }
    }

    // Calculate shipping (free above Rs. 2000)
    const shippingCost = subtotal >= 2000 ? 0 : 200;

    const order = await Order.create({
      user: req.user?._id,
      guestEmail: !req.user ? shippingAddress.email : undefined,
      items: orderItems,
      shippingAddress,
      paymentMethod,
      subtotal,
      shippingCost,
      discount,
      couponCode: discount > 0 ? couponCode : undefined,
      total: subtotal + shippingCost - discount,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
      statusHistory: [{ status: 'pending', note: 'Order placed' }]
    });

    // Update product stock
    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (item.variant?.size) {
        const variant = product.variants.find(v => v.size === item.variant.size);
        if (variant) {
          variant.stock -= item.quantity;
        }
      }
      product.totalStock -= item.quantity;
      await product.save();
    }

    // Clear user's cart
    if (req.user) {
      await Cart.findOneAndUpdate(
        { user: req.user._id },
        { items: [], discount: 0, couponCode: null }
      );
    }

    res.status(201).json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get user orders
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-statusHistory');

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single order
exports.getOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      $or: [
        { _id: req.params.id },
        { orderNumber: req.params.id }
      ]
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order (unless admin)
    if (req.user && req.user.role !== 'admin' &&
        order.user?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Track order (public)
exports.trackOrder = async (req, res) => {
  try {
    const { orderNumber, email } = req.query;

    const order = await Order.findOne({ orderNumber })
      .select('orderNumber status statusHistory shippingAddress.email trackingNumber trackingUrl createdAt');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Verify email for guest orders
    if (email && order.shippingAddress.email !== email) {
      return res.status(403).json({
        success: false,
        message: 'Email does not match order'
      });
    }

    res.json({
      success: true,
      order: {
        orderNumber: order.orderNumber,
        status: order.status,
        statusHistory: order.statusHistory,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        createdAt: order.createdAt
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Get all orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      orders,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Update order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, trackingUrl, note } = req.body;

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (trackingUrl) order.trackingUrl = trackingUrl;

    order.statusHistory.push({
      status,
      note: note || `Status changed to ${status}`
    });

    // Update payment status if delivered with COD
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Cancel order
exports.cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (['delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel this order'
      });
    }

    // Restore stock
    for (const item of order.items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (item.variant?.size) {
          const variant = product.variants.find(v => v.size === item.variant.size);
          if (variant) {
            variant.stock += item.quantity;
          }
        }
        product.totalStock += item.quantity;
        await product.save();
      }
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      note: req.body.reason || 'Order cancelled'
    });

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled',
      order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
