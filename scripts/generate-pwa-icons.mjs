/**
 * public/header-app-icon.png → PWA·홈화면·favicon PNG
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const srcPath = join(root, 'public', 'header-app-icon.png')
const src = readFileSync(srcPath)

const out = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
  ['favicon-32.png', 32],
]

for (const [name, size] of out) {
  await sharp(src).resize(size, size).png().toFile(join(root, 'public', name))
}
console.log('PWA PNG icons:', out.map(([n]) => n).join(', '))
