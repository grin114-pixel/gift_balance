/**
 * public/wallet-app-icon.svg → PNG (iOS·Android 홈화면 / favicon 호환)
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const svgPath = join(root, 'public', 'wallet-app-icon.svg')
const svg = readFileSync(svgPath)

const out = [
  ['pwa-192.png', 192],
  ['pwa-512.png', 512],
  ['apple-touch-icon.png', 180],
]

for (const [name, size] of out) {
  await sharp(svg).resize(size, size).png().toFile(join(root, 'public', name))
}
console.log('PWA PNG icons:', out.map(([n]) => n).join(', '))
