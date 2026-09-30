// @vitest-environment node
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { checkBudget, measureBundle } from './check-bundle-size.mjs'

const SCRIPT = join(process.cwd(), 'scripts', 'check-bundle-size.mjs') // tests run from the repo root
const KB = 1024

const HTML = `<!doctype html><html><head>
  <link rel="icon" href="/vite.svg" />
  <script type="module" crossorigin src="/assets/index-AAA.js"></script>
  <link rel="modulepreload" crossorigin href="/assets/react-vendor-BBB.js">
  <link rel="stylesheet" crossorigin href="/assets/index-CCC.css">
</head><body><div id="root"></div></body></html>`

const tempDirs = []
afterEach(() => {
  tempDirs.splice(0).forEach((dir) => rmSync(dir, { recursive: true, force: true }))
})

/** A fake `dist`. Random bytes don't compress, so a file of N KB counts as ~N KB gzipped. */
function fakeProject({ files, budget = { initialGzipKB: 100, lazyChunkGzipKB: 30 }, html = HTML }) {
  const root = mkdtempSync(join(tmpdir(), 'bundle-'))
  tempDirs.push(root)
  mkdirSync(join(root, 'dist', 'assets'), { recursive: true })
  writeFileSync(join(root, 'dist', 'index.html'), html)
  for (const [name, sizeKb] of Object.entries(files)) {
    writeFileSync(join(root, 'dist', 'assets', name), randomBytes(sizeKb * KB))
  }
  writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'fake', bundleBudget: budget }))
  return root
}

const runScript = (root) => {
  try {
    const stdout = execFileSync(process.execPath, [SCRIPT], { cwd: root, encoding: 'utf8', stdio: 'pipe' })
    return { code: 0, stdout, stderr: '' }
  } catch (error) {
    return { code: error.status, stdout: error.stdout ?? '', stderr: error.stderr ?? '' }
  }
}

const normal = { 'index-AAA.js': 40, 'react-vendor-BBB.js': 30, 'index-CCC.css': 1, 'Weighings-DDD.js': 8, 'Transactions-EEE.js': 12 }

describe('measureBundle', () => {
  it('counts the entry, its preloads and the stylesheet as the initial download', () => {
    const measured = measureBundle(join(fakeProject({ files: normal }), 'dist'))
    expect(measured.initialFiles.map((f) => f.name).sort()).toEqual(['index-AAA.js', 'index-CCC.css', 'react-vendor-BBB.js'])
    expect(measured.initialGzip / KB).toBeGreaterThan(70)
    expect(measured.initialGzip / KB).toBeLessThan(75)
  })

  it('treats every other chunk as a lazily loaded page and finds the largest', () => {
    const measured = measureBundle(join(fakeProject({ files: normal }), 'dist'))
    expect(measured.lazyFiles.map((f) => f.name).sort()).toEqual(['Transactions-EEE.js', 'Weighings-DDD.js'])
    expect(measured.largestLazy.name).toBe('Transactions-EEE.js')
  })

  it('does not count files the page never references (they are not downloaded up front)', () => {
    const measured = measureBundle(join(fakeProject({ files: { ...normal, 'Orphan-ZZZ.js': 50 } }), 'dist'))
    expect(measured.initialFiles.map((f) => f.name)).not.toContain('Orphan-ZZZ.js')
  })
})

describe('checkBudget', () => {
  const budget = { initialGzipKB: 100, lazyChunkGzipKB: 30 }
  const measure = (files) => measureBundle(join(fakeProject({ files }), 'dist'))

  it('passes within budget', () => {
    expect(checkBudget(measure(normal), budget)).toEqual([])
  })

  it('flags an initial download over budget and points at lazyPages.ts', () => {
    // A page imported eagerly would land in the entry chunk like this.
    const problems = checkBudget(measure({ ...normal, 'index-AAA.js': 90 }), budget)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/Initial download/)
    expect(problems[0]).toMatch(/lazyPages\.ts/)
  })

  it('flags a page chunk that grew too much, naming it', () => {
    const problems = checkBudget(measure({ ...normal, 'Transactions-EEE.js': 45 }), budget)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/Transactions-EEE\.js/)
  })

  it('reports both when both are over', () => {
    expect(checkBudget(measure({ ...normal, 'index-AAA.js': 90, 'Transactions-EEE.js': 45 }), budget)).toHaveLength(2)
  })
})

describe('the command (what CI runs)', () => {
  it('exits 0 and prints the sizes when within budget', () => {
    const result = runScript(fakeProject({ files: normal }))
    expect(result.code).toBe(0)
    expect(result.stdout).toMatch(/Within budget/)
    expect(result.stdout).toMatch(/Initial download/)
  })

  it('exits 1 with a clear message when the budget is exceeded, so CI fails', () => {
    const result = runScript(fakeProject({ files: { ...normal, 'index-AAA.js': 90 } }))
    expect(result.code).toBe(1)
    expect(result.stderr).toMatch(/Bundle budget exceeded/)
  })

  it('exits 2 when there is no build to measure', () => {
    const root = mkdtempSync(join(tmpdir(), 'bundle-'))
    tempDirs.push(root)
    writeFileSync(join(root, 'package.json'), JSON.stringify({ bundleBudget: { initialGzipKB: 1, lazyChunkGzipKB: 1 } }))
    const result = runScript(root)
    expect(result.code).toBe(2)
    expect(result.stderr).toMatch(/pnpm build/)
  })
})
