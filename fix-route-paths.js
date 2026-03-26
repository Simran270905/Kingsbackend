import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Fix import paths in route files
function fixRouteImports() {
  const routesDir = path.join(__dirname, 'routes')
  
  function processDirectory(dir) {
    if (!fs.existsSync(dir)) return
    
    const files = fs.readdirSync(dir)
    files.forEach(file => {
      const filePath = path.join(dir, file)
      const stat = fs.statSync(filePath)
      
      if (stat.isDirectory()) {
        processDirectory(filePath)
      } else if (file.endsWith('.js')) {
        try {
          let content = fs.readFileSync(filePath, 'utf8')
          let changed = false
          
          // Fix controller imports
          content = content.replace(/from ['"]\.\.\/controllers\/shared\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
          content = content.replace(/from ['"]\.\.\/controllers\/admin\/([^'"]+)['"]/g, 'from \'../../controllers/admin/$1\'')
          content = content.replace(/from ['"]\.\.\/controllers\/customer\/([^'"]+)['"]/g, 'from \'../../controllers/customer/$1\'')
          
          // Fix middleware imports
          content = content.replace(/from ['"]\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
          
          if (changed) {
            fs.writeFileSync(filePath, content)
            console.log(`✅ Fixed: ${path.relative(__dirname, filePath)}`)
          }
        } catch (error) {
          console.error(`❌ Error fixing ${filePath}:`, error.message)
        }
      }
    })
  }
  
  processDirectory(routesDir)
}

console.log('🔧 Fixing route import paths...')
fixRouteImports()
console.log('✅ Route imports fixed!')
