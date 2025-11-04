import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const browserPath = path.join(
  os.homedir(),
  'AppData',
  'Local',
  'ms_playwright',
  'chromium-1169',
  'chrome-win'
)

const target = path.join(__dirname, '..', 'vendor', 'chromium')

await fs.copy(browserPath, target)
