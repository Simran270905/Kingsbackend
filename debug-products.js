import Product from './models/Product.js';
import Category from './models/Category.js';
import { sendSuccess } from './middleware/errorHandler.js';

// Debug endpoint to check product categories in MongoDB
export const debugProductCategories = async (req, res) => {
  try {
    console.log('=== DEBUG: Checking MongoDB Product Categories ===');
    
    // Check categories
    const categories = await Category.find({});
    console.log('Categories found:', categories.length);
    
    // Check products with raw data
    const allProducts = await Product.find({});
    console.log('Total products:', allProducts.length);
    
    // Check raw category field values
    console.log('\n=== RAW CATEGORY FIELD ANALYSIS ===');
    const rawCategoryValues = allProducts.slice(0, 5).map((product, index) => {
      return {
        index: index + 1,
        name: product.name,
        category: product.category,
        categoryType: typeof product.category,
        categoryString: String(product.category),
        categoryExists: product.category !== undefined && product.category !== null
      };
    });
    
    rawCategoryValues.forEach(item => {
      console.log(`Product ${item.index}: ${item.name}`);
      console.log(`  - Category value: ${item.category}`);
      console.log(`  - Category type: ${item.categoryType}`);
      console.log(`  - Category string: ${item.categoryString}`);
      console.log(`  - Category exists: ${item.categoryExists}`);
      console.log('---');
    });
    
    // Check products with category field
    const productsWithCategories = await Product.find({ 
      category: { $exists: true, $ne: null, $ne: undefined } 
    });
    console.log('Products with category field:', productsWithCategories.length);
    
    // Check products without category field
    const productsWithoutCategories = await Product.find({
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: undefined }
      ]
    });
    console.log('Products without category field:', productsWithoutCategories.length);
    
    // Get sample products with populated categories
    let sampleProducts = [];
    if (productsWithCategories.length > 0) {
      sampleProducts = await Product.find({ 
        category: { $exists: true, $ne: null, $ne: undefined } 
      })
      .populate('category')
      .limit(3);
      
      console.log('Sample products with populated categories:');
      sampleProducts.forEach((product, index) => {
        console.log(`Sample ${index + 1}:`);
        console.log('- Product:', product.name);
        console.log('- Raw category field:', product.category);
        console.log('- Category type:', typeof product.category);
        console.log('- Category name:', product.category?.name);
      });
    }
    
    // Get sample products without categories
    let sampleWithoutCategories = [];
    if (productsWithoutCategories.length > 0) {
      sampleWithoutCategories = productsWithoutCategories.slice(0, 3);
      console.log('Sample products without categories:');
      sampleWithoutCategories.forEach((product, index) => {
        console.log(`Sample ${index + 1}:`);
        console.log('- Product:', product.name);
        console.log('- Category field:', product.category);
      });
    }
    
    const debugData = {
      summary: {
        totalCategories: categories.length,
        totalProducts: allProducts.length,
        productsWithCategories: productsWithCategories.length,
        productsWithoutCategories: productsWithoutCategories.length
      },
      categories: categories.map(cat => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug
      })),
      sampleWithCategories: sampleProducts.map(product => ({
        _id: product._id,
        name: product.name,
        category: product.category,
        categoryName: product.category?.name
      })),
      sampleWithoutCategories: sampleWithoutCategories.map(product => ({
        _id: product._id,
        name: product.name,
        category: product.category
      }))
    };
    
    sendSuccess(res, debugData, 200, 'Debug data retrieved successfully');
    
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
};
