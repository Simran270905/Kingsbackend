import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Function to fix imports in route files
function fixRouteImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Fix controller imports
    content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/admin/$1\'')
    
    // Fix middleware imports
    content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ Fixed imports in: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
  }
}

// Process admin route files
const adminRoutesDir = path.join(__dirname, 'routes/admin')
const customerRoutesDir = path.join(__dirname, 'routes/customer')

console.log('🔧 Fixing admin route imports...')
const adminRouteFiles = fs.readdirSync(adminRoutesDir).filter(file => file.endsWith('.js'))
adminRouteFiles.forEach(file => {
  const filePath = path.join(adminRoutesDir, file)
  fixRouteImports(filePath)
})

console.log('🔧 Fixing customer route imports...')
const customerRouteFiles = fs.readdirSync(customerRoutesDir).filter(file => file.endsWith('.js'))
customerRouteFiles.forEach(file => {
  const filePath = path.join(customerRoutesDir, file)
  fixRouteImports(filePath, 'customer')
})

console.log('✅ All route imports fixed!')
