/**
 * Render the Linux hicolor icon set from `resources/icon.svg`.
 *
 * electron-builder installs a directory of `NxN.png` files as one hicolor size per file, but a
 * single PNG is installed at that PNG's own edge instead (1104x1104 here), and freedesktop icon
 * themes index neither that directory nor any size above 512. Launchers that integrate the
 * AppImage then find no icon for the installed entry. The committed `resources/icons/` directory
 * is the output; rerun `pnpm run render:linux-icons` in `apps/desktop` after changing the vector
 * source.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

/** Bitmap edges installed as hicolor sizes: menus from 16 px up through the largest indexed size. */
export const LINUX_ICON_SIZES = [16, 32, 48, 64, 128, 256, 512] as const

/** Vector source and committed output directory of the Linux icon set. */
export const LINUX_ICON_PATHS = {
  source: fileURLToPath(new URL('../resources/icon.svg', import.meta.url)),
  outputDir: fileURLToPath(new URL('../resources/icons/', import.meta.url)),
} as const

/** Coordinate space of the vector source; sharp's SVG density is scaled against it. */
const SOURCE_EDGE = 1104
const SOURCE_DENSITY = 72

async function main(): Promise<void> {
  const svg = await readFile(LINUX_ICON_PATHS.source)
  await mkdir(LINUX_ICON_PATHS.outputDir, { recursive: true })
  await Promise.all(LINUX_ICON_SIZES.map(async size => {
    const png = await sharp(svg, { density: SOURCE_DENSITY * size / SOURCE_EDGE })
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toBuffer()
    await writeFile(resolve(LINUX_ICON_PATHS.outputDir, `${String(size)}x${String(size)}.png`), png)
  }))
  console.info(`linux icons: wrote ${String(LINUX_ICON_SIZES.length)} sizes to ${LINUX_ICON_PATHS.outputDir}`)
}

if (process.argv[1] !== undefined && import.meta.filename === resolve(process.argv[1])) await main()
