import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, it } from 'vitest'
import { desktopBuildVersionPrefix } from '../scripts/desktop-build-version.mjs'
import { createElectronBuilderConfig } from '../scripts/electron-builder-config.mjs'

const ICONS_DIR = fileURLToPath(new URL('../resources/icons', import.meta.url))
const ICON_FILE = /^(\d+)x(\d+)\.png$/u

/** Build the Linux packaging config the way a release environment does. */
function linuxConfig(): ReturnType<typeof createElectronBuilderConfig> {
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
  return createElectronBuilderConfig({
    DSH_DESKTOP_APP_ID: 'com.example.launcher-test',
    DSH_DESKTOP_AUTO_UPDATE_ENV: 'production',
    DSH_DESKTOP_UPDATE_CHANNEL: 'stable',
    DSH_DESKTOP_BUILD_VERSION: `${desktopBuildVersionPrefix(manifest.version)}20261116.1`,
    DSH_DESKTOP_MANDATORY_UPDATE_PROD_ORIGIN: 'https://policy.example.com',
  }, 'linux', 'x64')
}

it('installs one indexed hicolor size per icon file', () => {
  const config = linuxConfig()
  // A single PNG would be installed at its own edge (1104x1104), which icon themes do not index.
  expect(config.linux.icon).toBe(ICONS_DIR)
  const sizes = readdirSync(ICONS_DIR).flatMap(name => {
    const match = ICON_FILE.exec(name)
    return match === null ? [] : [Number(match[1])]
  }).sort((left, right) => left - right)
  expect(sizes).toEqual([16, 32, 48, 64, 128, 256, 512])
  for (const size of sizes) {
    const png = readFileSync(`${ICONS_DIR}/${String(size)}x${String(size)}.png`)
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([size, size])
  }
})

it('names the window class the packaged application reports', () => {
  // StartupWMClass gates whether the dock associates the running window with this entry.
  expect(linuxConfig().linux.desktop).toEqual({ entry: { StartupWMClass: 'deepseek-ai-dsh-desktop' } })
})
