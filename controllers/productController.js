const Product = require('../models/Product');
const Category = require('../models/Category');
const mongoose = require('mongoose');

const normalizeParam = (value) => decodeURIComponent(String(value || '')).trim();

const buildProductLookup = (idOrSlug) => {
  const normalized = normalizeParam(idOrSlug);
  const slug = normalized.toLowerCase();
  const clauses = [{ slug }];

  if (mongoose.Types.ObjectId.isValid(normalized)) {
    clauses.push({ _id: normalized });
  }

  return clauses;
};

// Get single product (admin - includes inactive)
exports.getProductAdmin = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: buildProductLookup(req.params.id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.json({
      success: true,
      product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all products
exports.getProducts = async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      inStock,
      sort,
      page = 1,
      limit = 12,
      featured,
      hotSelling,
      newArrival
    } = req.query;

    const query = { isActive: true };

    // Category filter
    if (category) {
      const categoryDoc = await Category.findOne({
        $or: [{ _id: category.match(/^[0-9a-fA-F]{24}$/) ? category : null }, { slug: category }, { name: category }],
        isActive: true,
      });

      if (categoryDoc) {
        query.categoryRef = categoryDoc._id;
      } else {
        query.category = category;
      }
    }

    // Search
    if (search) {
      query.$text = { $search: search };
    }

    // Price range
    if (minPrice || maxPrice) {
      query.basePrice = {};
      if (minPrice) query.basePrice.$gte = Number(minPrice);
      if (maxPrice) query.basePrice.$lte = Number(maxPrice);
    }

    // Stock filter
    if (inStock === 'true') {
      query.totalStock = { $gt: 0 };
    }

    // Featured products
    if (featured === 'true') {
      query.isFeatured = true;
    }

    // Hot selling
    if (hotSelling === 'true') {
      query.isHotSelling = true;
    }

    // New arrivals
    if (newArrival === 'true') {
      query.isNewArrival = true;
    }

    // Sorting
    let sortOption = { createdAt: -1 };
    if (sort === 'price-asc') sortOption = { basePrice: 1 };
    if (sort === 'price-desc') sortOption = { basePrice: -1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'rating') sortOption = { 'rating.average': -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('categoryRef', 'name slug')
      .sort(sortOption)
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
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

// Get single product
exports.getProduct = async (req, res) => {
  try {
    const lookup = buildProductLookup(req.params.id);
    const product = await Product.findOne({
      $or: lookup,
      isActive: true
    }).populate('categoryRef', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get related products
exports.getRelatedProducts = async (req, res) => {
  try {
    const product = await Product.findOne({
      $or: buildProductLookup(req.params.id),
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const relatedProducts = await Product.find({
      _id: { $ne: product._id },
      ...(product.categoryRef ? { categoryRef: product.categoryRef } : { category: product.category }),
      isActive: true
    })
      .populate('categoryRef', 'name slug')
      .limit(4);

    res.json({
      success: true,
      products: relatedProducts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ name: 1 });

    const categoryData = await Promise.all(
      categories.map(async (cat) => {
        const count = await Product.countDocuments({ categoryRef: cat._id, isActive: true });
        return { id: cat._id, name: cat.name, slug: cat.slug, count };
      })
    );

    res.json({
      success: true,
      categories: categoryData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Create product
exports.createProduct = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.categoryId) {
      const category = await Category.findOne({ _id: payload.categoryId, isActive: true });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid categoryId',
        });
      }
      payload.categoryRef = category._id;
      payload.category = category.slug;
      delete payload.categoryId;
    }

    const product = await Product.create(payload);

    res.status(201).json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Update product
exports.updateProduct = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (payload.categoryId) {
      const category = await Category.findOne({ _id: payload.categoryId, isActive: true });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Invalid categoryId',
        });
      }
      payload.categoryRef = category._id;
      payload.category = category.slug;
      delete payload.categoryId;
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Delete product
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// ADMIN: Get all products (including inactive)
exports.getAllProductsAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    const query = {};
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const products = await Product.find(query)
      .populate('categoryRef', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
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
