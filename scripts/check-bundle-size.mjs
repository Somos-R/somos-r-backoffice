// Fails the build when the JavaScript a first visit downloads (or a single page's chunk) grows past
// the budget in package.json ("bundleBudget"). Sizes are gzipped, like what the browser receives.
//
//   pnpm build && node scripts/check-bundle-size.mjs
import { appendFileSync, existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gzipSync } from 'node:zlib'

const KB = 1024
const kb = (bytes) => bytes / KB

/** Files the browser needs before it can show anything: the entry, its preloads and the stylesheet. */
function initialAssets(html) {
  const found = new Set()
  for (const match of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="\/(assets\/[^"]+\.(?:js|css))"/g)) {
    found.add(match[1])
  }
  return found
}

const gzipSize = (file) => gzipSync(readFileSync(file)).length

export function measureBundle(distDir) {
  const html = readFileSync(join(distDir, 'index.html'), 'utf8')
  const initial = initialAssets(html)

  const all = readdirSync(join(distDir, 'assets')).filter((name) => name.endsWith('.js') || name.endsWith('.css'))
  const files = all.map((name) => ({
    name,
    gzip: gzipSize(join(distDir, 'assets', name)),
    initial: initial.has(`assets/${name}`),
  }))

  const initialFiles = files.filter((f) => f.initial)
  const lazyFiles = files.filter((f) => !f.initial && f.name.endsWith('.js'))

  return {
    initialFiles,
    lazyFiles,
    initialGzip: initialFiles.reduce((sum, f) => sum + f.gzip, 0),
    largestLazy: lazyFiles.reduce((max, f) => (f.gzip > (max?.gzip ?? 0) ? f : max), null),
  }
}

/** Returns a human-readable line for each budget that was exceeded (empty = all good). */
export function checkBudget(measured, budget) {
  const problems = []
  if (kb(measured.initialGzip) > budget.initialGzipKB) {
    problems.push(
      `Initial download is ${kb(measured.initialGzip).toFixed(1)} KB gzipped; the budget is ${budget.initialGzipKB} KB. ` +
        'Something moved into the first load: check for pages imported directly instead of through lazyPages.ts, or a heavy new dependency.',
    )
  }
  if (measured.largestLazy && kb(measured.largestLazy.gzip) > budget.lazyChunkGzipKB) {
    problems.push(
      `${measured.largestLazy.name} is ${kb(measured.largestLazy.gzip).toFixed(1)} KB gzipped; ` +
        `no single page chunk may exceed ${budget.lazyChunkGzipKB} KB.`,
    )
  }
  return problems
}

function report(measured, budget) {
  const line = (f) => `  ${kb(f.gzip).toFixed(1).padStart(7)} KB  ${f.name}`
  const lines = [
    `Initial download: ${kb(measured.initialGzip).toFixed(1)} KB gzipped (budget ${budget.initialGzipKB} KB)`,
    ...measured.initialFiles.sort((a, b) => b.gzip - a.gzip).map(line),
    '',
    `Largest page chunk: ${measured.largestLazy ? kb(measured.largestLazy.gzip).toFixed(1) : 0} KB (budget ${budget.lazyChunkGzipKB} KB)`,
    ...measured.lazyFiles.sort((a, b) => b.gzip - a.gzip).map(line),
  ]
  return lines.join('\n')
}

function main() {
  const root = resolve(process.cwd())
  const distDir = join(root, 'dist')
  if (!existsSync(join(distDir, 'index.html'))) {
    console.error('dist/index.html not found: run `pnpm build` first.')
    process.exit(2)
  }
  const budget = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).bundleBudget
  if (!budget) {
    console.error('package.json has no "bundleBudget".')
    process.exit(2)
  }

  const measured = measureBundle(distDir)
  const text = report(measured, budget)
  console.log(text)

  // Shown on the GitHub Actions run page when available.
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, '### Bundle size\n\n```\n' + text + '\n```\n')
  }

  const problems = checkBudget(measured, budget)
  if (problems.length > 0) {
    console.error('\nBundle budget exceeded:\n- ' + problems.join('\n- '))
    process.exit(1)
  }
  console.log('\nWithin budget.')
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
