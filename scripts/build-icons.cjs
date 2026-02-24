#!/usr/bin/env node
/**
 * Build all platform icon assets from build/icon.svg
 * Requires: macOS (uses sips + iconutil)
 */
const { execSync, spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

const ROOT = path.join(__dirname, '..')
const BUILD_DIR = path.join(ROOT, 'build')
const SVG = path.join(BUILD_DIR, 'icon.svg')
const ICONSET = path.join(BUILD_DIR, 'icon.iconset')
const ICNS = path.join(BUILD_DIR, 'icon.icns')
const ICO = path.join(BUILD_DIR, 'icon.ico')
const PNG_LINUX = path.join(BUILD_DIR, 'icon.png')
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vradio-icon-'))

function run(cmd) {
  console.log('  $', cmd)
  execSync(cmd, { stdio: 'inherit' })
}

function svgToPng(src, dest, size) {
  // Try qlmanage first (Quick Look, ships with macOS)
  const qlDir = path.join(TMP, `ql_${size}`)
  fs.mkdirSync(qlDir, { recursive: true })
  const r = spawnSync('qlmanage', ['-t', '-s', String(size), '-o', qlDir, src], { encoding: 'utf8' })
  // qlmanage appends ".png" to the filename, but sometimes adds extra suffixes
  if (r.status === 0) {
    const files = fs.readdirSync(qlDir)
    const found = files.find(f => f.endsWith('.png'))
    if (found) {
      fs.copyFileSync(path.join(qlDir, found), dest)
      // Ensure exact size with sips
      run(`sips --resampleHeightWidth ${size} ${size} "${dest}" --out "${dest}"`)
      return true
    }
  }
  // Fallback: try sips direct (works on some macOS versions)
  try {
    run(`sips -s format png "${src}" --out "${dest}"`)
    run(`sips --resampleHeightWidth ${size} ${size} "${dest}" --out "${dest}"`)
    return true
  } catch {}
  return false
}

console.log('\n📐 Building Tunebox icons...\n')

// 1. Generate master 1024×1024 PNG
const master = path.join(TMP, 'master.png')
console.log('▸ Generating 1024×1024 master PNG')
if (!svgToPng(SVG, master, 1024)) {
  console.error('✗ Failed to convert SVG → PNG. Install librsvg (brew install librsvg) and re-run.')
  process.exit(1)
}
console.log('  ✓ master PNG generated\n')

// 2. macOS iconset
console.log('▸ Building macOS .icns')
fs.mkdirSync(ICONSET, { recursive: true })
const SIZES = [16, 32, 64, 128, 256, 512, 1024]
for (const sz of SIZES) {
  const out = path.join(ICONSET, `icon_${sz}x${sz}.png`)
  run(`sips --resampleHeightWidth ${sz} ${sz} "${master}" --out "${out}"`)
  if (sz <= 512) {
    const out2x = path.join(ICONSET, `icon_${sz}x${sz}@2x.png`)
    const sz2 = sz * 2
    run(`sips --resampleHeightWidth ${sz2} ${sz2} "${master}" --out "${out2x}"`)
  }
}
run(`iconutil -c icns "${ICONSET}" -o "${ICNS}"`)
console.log(`  ✓ ${ICNS}\n`)

// 3. Linux PNG (512×512)
console.log('▸ Building Linux icon.png (512×512)')
run(`sips --resampleHeightWidth 512 512 "${master}" --out "${PNG_LINUX}"`)
console.log(`  ✓ ${PNG_LINUX}\n`)

// 4. Windows .ico (multi-size)
// Pure Node.js ICO encoder — no external tool required
console.log('▸ Building Windows icon.ico (16/32/48/64/128/256)')
const ICO_SIZES = [16, 32, 48, 64, 128, 256]
const pngBuffers = ICO_SIZES.map(sz => {
  const tmp = path.join(TMP, `ico_${sz}.png`)
  execSync(`sips --resampleHeightWidth ${sz} ${sz} "${master}" --out "${tmp}"`)
  return { sz, buf: fs.readFileSync(tmp) }
})

// Build ICO binary
const headerSize = 6 + ICO_SIZES.length * 16
let offset = headerSize
const dir = Buffer.alloc(headerSize)
// ICONDIR header
dir.writeUInt16LE(0, 0)  // reserved
dir.writeUInt16LE(1, 2)  // type: 1 = icon
dir.writeUInt16LE(ICO_SIZES.length, 4)
pngBuffers.forEach(({ sz, buf }, i) => {
  const e = 6 + i * 16
  dir.writeUInt8(sz >= 256 ? 0 : sz, e)        // width (0 = 256)
  dir.writeUInt8(sz >= 256 ? 0 : sz, e + 1)    // height
  dir.writeUInt8(0, e + 2)                      // color count
  dir.writeUInt8(0, e + 3)                      // reserved
  dir.writeUInt16LE(1, e + 4)                   // color planes
  dir.writeUInt16LE(32, e + 6)                  // bits per pixel
  dir.writeUInt32LE(buf.length, e + 8)          // image data size
  dir.writeUInt32LE(offset, e + 12)             // offset to image data
  offset += buf.length
})
const icoData = Buffer.concat([dir, ...pngBuffers.map(x => x.buf)])
fs.writeFileSync(ICO, icoData)
console.log(`  ✓ ${ICO}\n`)

// 5. Cleanup
fs.rmSync(TMP, { recursive: true, force: true })

console.log('✅ All icons generated successfully!\n')
console.log('  build/icon.icns  — macOS')
console.log('  build/icon.ico   — Windows')
console.log('  build/icon.png   — Linux')
