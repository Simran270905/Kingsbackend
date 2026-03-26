import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const routesDir = path.join(__dirname, 'routes/shared')

// Function to fix imports in route files
function fixRouteImports(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Fix controller imports
    content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
    
    // Fix middleware imports
    content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
    
    fs.writeFileSync(filePath, content)
    console.log(`✅ Fixed imports in: ${path.basename(filePath)}`)
  } catch (error) {
    console.error(`❌ Error fixing ${filePath}:`, error.message)
  }
}

// Process all route files
const routeFiles = fs.readdirSync(routesDir).filter(file => file.endsWith('.js'))

console.log('🔧 Fixing route imports...')
routeFiles.forEach(file => {
  const filePath = path.join(routesDir, file)
  fixRouteImports(filePath)
})

console.log('✅ Route imports fixed!')
