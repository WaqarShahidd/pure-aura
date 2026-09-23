// Drives the admin app the way a person would: sign in, look at the list, open a product.
// Same defensive touches as the storefront's script - own port, own server, console errors
// reported as a smoke test.
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'

const PORT = 5174
const url = `http://localhost:${PORT}`

async function answering() {
  try { await fetch(url, { signal: AbortSignal.timeout(1000) }); return true } catch { return false }
}

const child = spawn('npm', ['run', 'dev'], { stdio: 'ignore', shell: true })
for (let i = 0; i < 60; i += 1) {
  await new Promise((r) => setTimeout(r, 500))
  if (await answering()) break
}

const browser = await chromium.launch({ channel: 'chrome' })
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  page.on('pageerror', (e) => errors.push(e.message))

  await mkdir('screenshots', { recursive: true })

  await page.goto(url, { waitUntil: 'networkidle' })
  await page.screenshot({ path: 'screenshots/01-login.png' })

  await page.fill('input[type=email]', 'admin@pureaura.test')
  await page.fill('input[type=password]', 'admin12345')
  await page.click('button[type=submit]')
  await page.waitForTimeout(2500)
  await page.screenshot({ path: 'screenshots/02-dashboard.png' })

  await page.goto(`${url}/products`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: 'screenshots/03-products.png' })

  const firstRow = page.locator('.MuiDataGrid-row').first()
  if (await firstRow.count()) {
    await firstRow.click()
    await page.waitForTimeout(1800)
    await page.screenshot({ path: 'screenshots/04-editor-details.png' })

    await page.getByRole('tab', { name: 'Variants' }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/05-editor-variants.png' })

    await page.getByRole('tab', { name: 'Media' }).click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: 'screenshots/06-editor-media.png' })
  }

  await page.goto(`${url}/media`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1800)
  await page.screenshot({ path: 'screenshots/07-media.png' })

  console.log('captured 7 screens')
} finally {
  await browser.close()
  try { execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' }) } catch { /* gone */ }
}

console.log(errors.length ? `\n${errors.length} console error(s):\n  ${errors.join('\n  ')}` : '\nNo console errors.')
