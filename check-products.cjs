const mongoose = require('mongoose');
const Product = require('./models/Product');
const Category = require('./models/Category');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://Simrankadam_db_user:Simran123@cluster0.2sc2fg5.mongodb.net/?appName=Cluster0')
.then(async () => {
  console.log('=== CONNECTED TO MONGODB ===');
  
  try {
    // Check categories first
    console.log('\n=== CATEGORIES ===');
    const categories = await Category.find({});
    console.log('Total categories:', categories.length);
    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ${cat.name} (ID: ${cat._id})`);
    });
    
    // Check products with their actual category data
    console.log('\n=== PRODUCTS WITH CATEGORIES ===');
    const products = await Product.find({}).limit(5);
    console.log('Total products:', await Product.countDocuments());
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      console.log(`\nProduct ${i + 1}:`);
      console.log('- Name:', product.name);
      console.log('- ID:', product._id);
      console.log('- Category field:', product.category);
      console.log('- Category type:', typeof product.category);
      console.log('- Category exists:', !!product.category);
      
      // If category exists, try to populate it
      if (product.category) {
        try {
          const populatedProduct = await Product.findById(product._id).populate('category');
          console.log('- Populated category:', populatedProduct.category);
        } catch (err) {
          console.log('- Populate error:', err.message);
        }
      }
    }
    
    // Check if any products actually have categories
    console.log('\n=== CATEGORY ANALYSIS ===');
    const productsWithCategories = await Product.find({ category: { $exists: true, $ne: null } });
    console.log('Products with category field:', productsWithCategories.length);
    
    const productsWithoutCategories = await Product.find({ 
      $or: [
        { category: { $exists: false } },
        { category: null },
        { category: undefined }
      ]
    });
    console.log('Products without category field:', productsWithoutCategories.length);
    
    // Show sample of products with categories
    if (productsWithCategories.length > 0) {
      console.log('\n=== SAMPLE PRODUCTS WITH CATEGORIES ===');
      const sampleProducts = await Product.find({ category: { $exists: true, $ne: null } })
        .populate('category')
        .limit(3);
      
      sampleProducts.forEach((product, index) => {
        console.log(`Sample ${index + 1}:`);
        console.log('- Product:', product.name);
        console.log('- Category:', product.category);
        console.log('- Category Name:', product.category?.name);
      });
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.connection.close();
    process.exit(0);
  }
})
.catch(err => {
  console.error('Connection error:', err);
  process.exit(1);
});
