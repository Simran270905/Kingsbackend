import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Function to fix all imports in a directory
function fixAllImportsInDir(dir, controllerPrefix = '') {
  if (!fs.existsSync(dir)) return
  
  const files = fs.readdirSync(dir, { recursive: true })
  
  files.forEach(file => {
    if (typeof file === 'string') {
      const filePath = path.join(dir, file)
      
      if (fs.statSync(filePath).isDirectory()) return
      if (!file.endsWith('.js')) return
      
      try {
        let content = fs.readFileSync(filePath, 'utf8')
        let changed = false
        
        // Fix controller imports based on directory structure
        if (dir.includes('customer')) {
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/customer/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/admin\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
        } else if (dir.includes('admin')) {
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/admin/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/customer\/([^'"]+)['"]/g, 'from \'../../controllers/customer/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/shared\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
        } else if (dir.includes('shared')) {
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/([^'"]+)['"]/g, 'from \'../../controllers/shared/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/admin\/([^'"]+)['"]/g, 'from \'../../controllers/admin/$1\'')
          content = content.replace(/from ['"]\.\.\/\.\.\/controllers\/customer\/([^'"]+)['"]/g, 'from \'../../controllers/customer/$1\'')
        }
        
        // Fix middleware imports
        content = content.replace(/from ['"]\.\.\/\.\.\/middleware\/([^'"]+)['"]/g, 'from \'../../middleware/$1\'')
        
        if (changed) {
          fs.writeFileSync(filePath, content)
          console.log(`✅ Fixed: ${filePath}`)
        }
      } catch (error) {
        console.error(`❌ Error: ${filePath} - ${error.message}`)
      }
    }
  })
}

console.log('🔧 Fixing all route imports...')
fixAllImportsInDir(path.join(__dirname, 'routes'))
console.log('✅ All imports fixed!')
