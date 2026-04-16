import Product from './models/Product.js';
import Category from './models/Category.js';
import { sendSuccess, sendError } from './middleware/errorHandler.js';

// Fix product categories by assigning them based on product names
export const fixProductCategories = async (req, res) => {
  try {
    console.log('=== FIXING PRODUCT CATEGORIES ===');
    
    // Get all categories
    const categories = await Category.find({});
    console.log('Available categories:', categories.length);
    
    // Get all products first to check their category field values
    const allProducts = await Product.find({});
    console.log('Total products:', allProducts.length);
    
    // Check what category values actually exist
    const categoryFieldValues = allProducts.map(p => ({
      name: p.name,
      category: p.category,
      categoryType: typeof p.category,
      categoryString: String(p.category)
    }));
    
    console.log('Sample category field values:');
    categoryFieldValues.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.name}: category=${item.category}, type=${item.categoryType}`);
    });
    
    // Find products that actually need fixing (category is null/undefined)
    const productsNeedingCategories = allProducts.filter(product => 
      product.category === null || 
      product.category === undefined ||
      product.category === ''
    );
    
    console.log('Products needing category assignment:', productsNeedingCategories.length);
    
    // Category mapping based on product names
    const categoryMapping = {
      'kada': 'Kada',
      'chain': 'moti Chains',
      'moti': 'moti Chains',
      'rings': 'Rings',
      'ring': 'Rings',
      'bracelet': 'Bracelets',
      'bali': 'Men\'s Bali',
      'men\'s': 'Men\'s Bali',
      'rudraksh': 'Rudraksh',
      'pendant': 'Pendant',
      'pendal': 'Pendant',
      '50gms': '50gms chain',
      '50 gram': '50gms chain',
      '50g': '50gms chain'
    };
    
    let updatedCount = 0;
    
    for (const product of productsNeedingCategories) {
      const productName = product.name.toLowerCase();
      
      // Find matching category based on product name
      let matchedCategory = null;
      
      for (const [keyword, categoryName] of Object.entries(categoryMapping)) {
        if (productName.includes(keyword)) {
          matchedCategory = categories.find(cat => cat.name === categoryName);
          break;
        }
      }
      
      if (matchedCategory) {
        // Update product with category
        await Product.findByIdAndUpdate(product._id, {
          category: matchedCategory._id
        });
        
        console.log(`Updated product "${product.name}" with category "${matchedCategory.name}"`);
        updatedCount++;
      } else {
        console.log(`No category match found for product "${product.name}"`);
      }
    }
    
    console.log(`Total products updated: ${updatedCount}`);
    
    sendSuccess(res, {
      totalProducts: productsNeedingCategories.length,
      updatedProducts: updatedCount,
      categories: categories.map(cat => ({ _id: cat._id, name: cat.name }))
    }, 200, 'Product categories fixed successfully');
    
  } catch (error) {
    console.error('Error fixing product categories:', error);
    sendError(res, 'Failed to fix product categories', 500);
  }
};
