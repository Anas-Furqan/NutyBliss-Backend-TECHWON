const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models
const User = require('./models/User');
const Product = require('./models/Product');
const Coupon = require('./models/Coupon');

const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB Connected');
};

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await User.deleteMany({});
    await Product.deleteMany({});
    await Coupon.deleteMany({});

    // Create admin user (password will be hashed by User model pre-save hook)
    await User.create({
      name: 'Admin User',
      email: 'admin@nutybliss.pk',
      password: 'admin123',
      role: 'admin',
      isActive: true
    });

    // Create test user
    await User.create({
      name: 'Test User',
      email: 'user@test.com',
      password: 'user123',
      role: 'user',
      isActive: true
    });

    console.log('Users seeded');

    // Create products
    const products = [
      {
        title: 'Classic Creamy Peanut Butter',
        slug: 'classic-creamy-peanut-butter',
        description: 'Our signature classic creamy peanut butter made from 100% roasted peanuts. No added sugar, no preservatives, just pure peanut goodness. Perfect for spreading on toast, smoothies, or eating straight from the jar!',
        shortDescription: '100% natural creamy peanut butter with no added sugar',
        images: [{ url: '/images/products/creamy-pb-1.jpg', alt: 'Classic Creamy Peanut Butter' }],
        category: 'peanut-butter',
        variants: [
          { size: '500g', price: 1200, discountPrice: 999, stock: 50, sku: 'PB-CRM-500' },
          { size: '750g', price: 1700, discountPrice: 1499, stock: 30, sku: 'PB-CRM-750' },
          { size: '1kg', price: 2200, discountPrice: 1899, stock: 20, sku: 'PB-CRM-1000' }
        ],
        basePrice: 1200,
        baseDiscountPrice: 999,
        totalStock: 100,
        rating: { average: 4.8, count: 156 },
        tags: ['creamy', 'classic', 'bestseller'],
        ingredients: ['Roasted Peanuts', 'Salt'],
        nutritionFacts: { servingSize: '32g', calories: 190, protein: 7, carbs: 7, fat: 16, fiber: 2 },
        isFeatured: true,
        isHotSelling: true,
        isActive: true
      },
      {
        title: 'Crunchy Peanut Butter',
        slug: 'crunchy-peanut-butter',
        description: 'For those who love texture! Our crunchy peanut butter is packed with real peanut pieces for that satisfying crunch in every bite. Made from premium roasted peanuts.',
        shortDescription: 'Crunchy texture with real peanut pieces',
        images: [{ url: '/images/products/crunchy-pb-1.jpg', alt: 'Crunchy Peanut Butter' }],
        category: 'peanut-butter',
        variants: [
          { size: '500g', price: 1200, discountPrice: 999, stock: 40, sku: 'PB-CRN-500' },
          { size: '750g', price: 1700, discountPrice: 1499, stock: 25, sku: 'PB-CRN-750' },
          { size: '1kg', price: 2200, discountPrice: 1899, stock: 15, sku: 'PB-CRN-1000' }
        ],
        basePrice: 1200,
        baseDiscountPrice: 999,
        totalStock: 80,
        rating: { average: 4.7, count: 98 },
        tags: ['crunchy', 'textured'],
        ingredients: ['Roasted Peanuts', 'Salt'],
        nutritionFacts: { servingSize: '32g', calories: 190, protein: 7, carbs: 7, fat: 16, fiber: 2 },
        isFeatured: true,
        isHotSelling: true,
        isActive: true
      },
      {
        title: 'Chocolate Peanut Butter',
        slug: 'chocolate-peanut-butter',
        description: 'The perfect combination of rich chocolate and creamy peanut butter. Made with premium cocoa powder and no artificial sweeteners. A healthy treat!',
        shortDescription: 'Rich chocolate flavor meets creamy peanut butter',
        images: [{ url: '/images/products/choco-pb-1.jpg', alt: 'Chocolate Peanut Butter' }],
        category: 'peanut-butter',
        variants: [
          { size: '500g', price: 1400, discountPrice: 1199, stock: 35, sku: 'PB-CHO-500' },
          { size: '750g', price: 1900, discountPrice: 1699, stock: 20, sku: 'PB-CHO-750' }
        ],
        basePrice: 1400,
        baseDiscountPrice: 1199,
        totalStock: 55,
        rating: { average: 4.9, count: 72 },
        tags: ['chocolate', 'flavored', 'new'],
        ingredients: ['Roasted Peanuts', 'Cocoa Powder', 'Honey', 'Salt'],
        nutritionFacts: { servingSize: '32g', calories: 200, protein: 6, carbs: 10, fat: 15, fiber: 2 },
        isFeatured: true,
        isNewArrival: true,
        isActive: true
      },
      {
        title: 'Honey Peanut Butter',
        slug: 'honey-peanut-butter',
        description: 'A touch of natural sweetness! Our honey peanut butter combines creamy peanuts with pure organic honey for a naturally sweet and delicious spread.',
        shortDescription: 'Naturally sweetened with organic honey',
        images: [{ url: '/images/products/honey-pb-1.jpg', alt: 'Honey Peanut Butter' }],
        category: 'peanut-butter',
        variants: [
          { size: '500g', price: 1350, discountPrice: 1149, stock: 30, sku: 'PB-HON-500' },
          { size: '750g', price: 1850, discountPrice: 1599, stock: 18, sku: 'PB-HON-750' }
        ],
        basePrice: 1350,
        baseDiscountPrice: 1149,
        totalStock: 48,
        rating: { average: 4.6, count: 45 },
        tags: ['honey', 'sweet', 'natural'],
        ingredients: ['Roasted Peanuts', 'Organic Honey', 'Salt'],
        nutritionFacts: { servingSize: '32g', calories: 195, protein: 6, carbs: 9, fat: 15, fiber: 2 },
        isNewArrival: true,
        isActive: true
      },
      {
        title: 'Premium Rolled Oats',
        slug: 'premium-rolled-oats',
        description: 'Start your day right with our premium rolled oats. High in fiber, protein, and essential nutrients. Perfect for overnight oats, porridge, or baking.',
        shortDescription: 'High-fiber whole grain oats',
        images: [{ url: '/images/products/oats-1.jpg', alt: 'Premium Rolled Oats' }],
        category: 'oats',
        variants: [
          { size: '500g', price: 450, discountPrice: 399, stock: 60, sku: 'OAT-ROL-500' },
          { size: '1kg', price: 800, discountPrice: 699, stock: 40, sku: 'OAT-ROL-1000' }
        ],
        basePrice: 450,
        baseDiscountPrice: 399,
        totalStock: 100,
        rating: { average: 4.5, count: 67 },
        tags: ['oats', 'breakfast', 'healthy'],
        ingredients: ['Whole Grain Oats'],
        nutritionFacts: { servingSize: '40g', calories: 150, protein: 5, carbs: 27, fat: 3, fiber: 4 },
        isFeatured: true,
        isActive: true
      },
      {
        title: 'Healthy Starter Bundle',
        slug: 'healthy-starter-bundle',
        description: 'Everything you need to start your healthy journey! This bundle includes our bestselling Classic Creamy Peanut Butter (500g) and Premium Rolled Oats (500g) at a special price.',
        shortDescription: 'Peanut butter + Oats combo at special price',
        images: [{ url: '/images/products/bundle-1.jpg', alt: 'Healthy Starter Bundle' }],
        category: 'bundles',
        variants: [
          { size: 'Standard', price: 1650, discountPrice: 1299, stock: 25, sku: 'BND-STR-001' }
        ],
        basePrice: 1650,
        baseDiscountPrice: 1299,
        totalStock: 25,
        rating: { average: 4.9, count: 34 },
        tags: ['bundle', 'combo', 'value'],
        isFeatured: true,
        isHotSelling: true,
        isActive: true
      }
    ];

    await Product.insertMany(products);
    console.log('Products seeded');

    // Create coupons
    const coupons = [
      {
        code: 'WELCOME10',
        description: '10% off for new customers',
        discountType: 'percentage',
        discountValue: 10,
        minOrderAmount: 1000,
        maxDiscountAmount: 500,
        usageLimit: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        isActive: true
      },
      {
        code: 'SAVE200',
        description: 'Flat Rs. 200 off on orders above Rs. 2000',
        discountType: 'fixed',
        discountValue: 200,
        minOrderAmount: 2000,
        usageLimit: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true
      }
    ];

    await Coupon.insertMany(coupons);
    console.log('Coupons seeded');

    console.log('\\n=== Seed Data Complete ===');
    console.log('Admin Login: admin@nutybliss.pk / admin123');
    console.log('User Login: user@test.com / user123');
    console.log('Coupon Codes: WELCOME10, SAVE200');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
