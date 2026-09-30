import axe, { type AxeResults, type Result, type RunOptions } from 'axe-core'

// Accessibility checks for component tests, on top of axe-core (the engine behind most a11y tools).
//
// jsdom has no layout engine, so rules that need real rendering can't run here and are switched off:
// color contrast (needs computed colors on painted pixels) and region/landmark checks that depend on
// the full page. Everything else (names, roles, labels, ARIA validity, headings, focus order markup)
// is checked for real.
const BASE_RULES: RunOptions['rules'] = { 'color-contrast': { enabled: false } }

// A single component is not a whole page, so page-structure rules (one <main>, one <h1>, everything
// inside a landmark) only make sense when the whole app is rendered: opt in with `fullPage`.
const COMPONENT_RULES: RunOptions['rules'] = {
  ...BASE_RULES,
  region: { enabled: false },
  'landmark-one-main': { enabled: false },
  'page-has-heading-one': { enabled: false },
}

function describeViolation(violation: Result): string {
  const nodes = violation.nodes
    .slice(0, 3)
    .map((node) => `      ${node.target.join(' ')}\n        ${node.html.slice(0, 140).replace(/\s+/g, ' ')}`)
    .join('\n')
  return `  [${violation.impact ?? 'n/a'}] ${violation.id}: ${violation.help}\n${nodes}${violation.nodes.length > 3 ? `\n      … and ${violation.nodes.length - 3} more` : ''}`
}

export async function runAxe(root: Element = document.body, { fullPage = false } = {}): Promise<AxeResults> {
  return axe.run(root, { rules: fullPage ? BASE_RULES : COMPONENT_RULES })
}

/**
 * Fails with a readable list of every accessibility violation found under `root`.
 * `fullPage: true` also checks page structure (a single <main>, one <h1>, content inside landmarks).
 */
export async function expectNoA11yViolations(root: Element = document.body, options: { fullPage?: boolean } = {}): Promise<void> {
  const { violations } = await runAxe(root, options)
  if (violations.length > 0) {
    throw new Error(`${violations.length} accessibility violation(s):\n${violations.map(describeViolation).join('\n')}`)
  }
}
