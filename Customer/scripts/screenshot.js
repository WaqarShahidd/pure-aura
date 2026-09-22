/**
 * Visual-verification screenshot script.
 *
 * Drives the locally installed Chrome (not a downloaded Chromium) against a dev server this
 * script starts and shuts down itself, and writes a full-page PNG to screenshots/.
 *
 *   npm run screenshot                          full-page desktop shot of /
 *   npm run screenshot -- --path /              same thing, explicit
 *   npm run screenshot -- --viewport mobile     390x844
 *   npm run screenshot -- --viewport 1280x720   custom size
 *   npm run screenshot -- --no-full             viewport-only, not full page
 *   npm run screenshot -- --out shots/hero.png  custom output path
 *   npm run screenshot -- --port 5200           serve on a different port
 */
import { chromium } from 'playwright'
import { spawn, execSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844, isMobile: true, hasTouch: true },
}

// A dedicated port, not Vite's default 5173 — another project's dev server is often already
// sitting there, and silently screenshotting the wrong app is worse than failing outright.
const DEFAULT_PORT = 5199

function parseArgs(argv) {
  const args = { path: '/', viewport: 'desktop', full: true, out: null, wait: 600, port: DEFAULT_PORT }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '--no-full') args.full = false
    else if (arg === '--path') args.path = argv[++i]
    else if (arg === '--viewport') args.viewport = argv[++i]
    else if (arg === '--out') args.out = argv[++i]
    else if (arg === '--wait') args.wait = Number(argv[++i])
    else if (arg === '--port') args.port = Number(argv[++i])
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function normalizePath(value) {
  if (!value) return '/'
  // Git Bash applies MSYS path conversion to arguments that look like absolute POSIX paths,
  // rewriting "/collections/all" into "C:/Program Files/Git/collections/all" before node ever
  // sees it. Recover the intended route rather than navigating to a bogus URL.
  const mangled = /^[A-Za-z]:[\\/].*?[\\/]Git[\\/](.*)$/.exec(value)
  const route = mangled ? `/${mangled[1]}` : value
  return route.startsWith('/') ? route : `/${route}`
}

function resolveViewport(name) {
  if (VIEWPORTS[name]) return VIEWPORTS[name]
  const match = /^(\d+)x(\d+)$/.exec(name)
  if (!match) throw new Error(`--viewport must be desktop, mobile, or WIDTHxHEIGHT (got "${name}")`)
  return { width: Number(match[1]), height: Number(match[2]) }
}

function defaultOutPath(routePath, viewportName) {
  const slug = routePath.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'home'
  return `screenshots/${slug}-${viewportName}.png`
}

async function isPortAnswering(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(1000) })
    return true
  } catch {
    return false
  }
}

/** Starts `vite` on our own port and resolves once it answers, or throws after ~30s. */
async function startDevServer(url, port) {
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: 'ignore',
    shell: true,
  })

  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((r) => setTimeout(r, 500))
    if (await isPortAnswering(url)) return child
  }
  stopDevServer(child)
  throw new Error(`Dev server did not come up on ${url} within 30s`)
}

/** `child.kill()` only kills the npm shim on Windows — the vite process survives it. */
function stopDevServer(child) {
  if (!child?.pid) return
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' })
    } else {
      child.kill('SIGTERM')
    }
  } catch {
    // process already gone
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  args.path = normalizePath(args.path)
  const viewport = resolveViewport(args.viewport)
  const outPath = resolve(args.out ?? defaultOutPath(args.path, args.viewport))
  const devUrl = `http://localhost:${args.port}`

  // Never reuse a server we didn't start: it may belong to an entirely different project.
  if (await isPortAnswering(devUrl)) {
    throw new Error(
      `Port ${args.port} is already in use. This script always serves Pure Aura itself so it ` +
        `cannot screenshot another project by mistake. Free the port, or pass --port <n>.`,
    )
  }

  console.log(`Starting dev server on ${devUrl}...`)
  const devServer = await startDevServer(devUrl, args.port)

  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      isMobile: viewport.isMobile ?? false,
      hasTouch: viewport.hasTouch ?? false,
      deviceScaleFactor: 2,
    })
    const page = await context.newPage()

    const errors = []
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()))
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(`${devUrl}${args.path}`, { waitUntil: 'networkidle' })
    await page.evaluate(() => document.fonts.ready)
    // Let entrance transitions and lazy images settle before capturing.
    await page.waitForTimeout(args.wait)

    await mkdir(dirname(outPath), { recursive: true })
    await page.screenshot({ path: outPath, fullPage: args.full })

    console.log(`Saved ${outPath}  (${viewport.width}x${viewport.height}${args.full ? ', full page' : ''})`)
    if (errors.length) {
      console.log(`\n${errors.length} console error(s):`)
      errors.forEach((e) => console.log(`  - ${e}`))
    } else {
      console.log('No console errors.')
    }
  } finally {
    await browser.close()
    stopDevServer(devServer)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
