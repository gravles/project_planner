import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')

const inputPath = join(root, 'public', 'icon.png')

const sizes = [192, 512]

async function generate() {
  for (const size of sizes) {
    const out = join(root, 'public', `icon-${size}.png`)
    await sharp(inputPath)
      .resize(size, size)
      .toFile(out)
    console.log(`✓  public/icon-${size}.png generated`)
  }
}

generate().catch(console.error)
