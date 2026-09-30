import ts from 'typescript'

// Finds user-visible Spanish text written directly in the code instead of in `es.json`.
// Used by a test, so a hardcoded string fails CI. Heuristics, tuned to have no false positives on
// this codebase: see the self-tests in src/__tests__/noHardcodedText.test.ts.

export interface Finding {
  line: number
  kind: string
  text: string
}

/** JSX attributes whose string value is text a user reads. */
const TEXT_ATTRIBUTES = new Set([
  'label', 'placeholder', 'title', 'helperText', 'sub', 'primary', 'secondary',
  'aria-label', 'alt', 'description', 'text', 'subtitle', 'message',
])
/** Object properties that carry text a user reads. */
const TEXT_PROPERTIES = new Set(['message', 'label', 'title', 'text', 'helperText', 'placeholder', 'description'])
/** Calls whose string arguments are shown to the user, e.g. setEditError('...'). */
const TEXT_CALL = /^set\w*(Error|Message)$/

// Words that make a multi-word string Spanish. Deliberately without "no" (it is also the start of
// English messages such as "No active session", which are not UI text).
const SPANISH_WORD = /\b(de|del|la|el|los|las|un|una|para|por|con|sin|hay|se|que|este|esta|y)\b/i
const SPANISH_LETTER = /[áéíóúñÁÉÍÓÚÑ¿¡]/

/** Prose a person would read, as opposed to a code, path, key or CSS value. */
const looksLikeProse = (text: string) => {
  const trimmed = text.trim()
  if (!/[A-Za-zÁ-ú]{3}/.test(trimmed)) return false
  if (/^[\w./:#@-]+$/.test(trimmed) && !/^[A-ZÁÉÍÓÚ][a-záéíóúñ]{3,}$/.test(trimmed)) return false
  return true
}

/** A string that is Spanish wherever it appears (accents, or several words with Spanish function words). */
const looksSpanish = (text: string) =>
  SPANISH_LETTER.test(text) || (/\s/.test(text.trim()) && SPANISH_WORD.test(text) && /[A-Za-z]{3}/.test(text))

export function findHardcodedText(source: string, fileName = 'file.tsx'): Finding[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const findings: Finding[] = []
  const seen = new Set<ts.Node>()

  const add = (node: ts.Node, kind: string, text: string) => {
    if (seen.has(node)) return
    seen.add(node)
    findings.push({ line: sf.getLineAndCharacterOfPosition(node.getStart()).line + 1, kind, text: text.trim().replace(/\s+/g, ' ') })
  }

  const inside = (node: ts.Node, predicate: (n: ts.Node) => boolean) => {
    for (let n: ts.Node | undefined = node.parent; n; n = n.parent) if (predicate(n)) return true
    return false
  }

  /**
   * True when `node` is rendered directly as text: it sits in a JSX `{...}` and only conditionals,
   * `&&`/`||`/`??` and parentheses lie between them (`{busy ? 'Saving' : 'Save'}`), not a call or an object.
   */
  const isRenderedText = (node: ts.Node) => {
    for (let n: ts.Node = node.parent; n; n = n.parent) {
      if (ts.isJsxExpression(n)) return true
      const passesThrough =
        ts.isConditionalExpression(n) ||
        ts.isParenthesizedExpression(n) ||
        (ts.isBinaryExpression(n) &&
          [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(n.operatorToken.kind))
      if (!passesThrough) return false
    }
    return false
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      if (node.getText().trim() && looksLikeProse(node.getText())) add(node, 'jsx-text', node.getText())
    } else if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ts.isStringLiteral(node.initializer) &&
      TEXT_ATTRIBUTES.has(node.name.getText()) &&
      looksLikeProse(node.initializer.text)
    ) {
      add(node.initializer, `attribute ${node.name.getText()}`, node.initializer.text)
    } else if (
      ts.isPropertyAssignment(node) &&
      TEXT_PROPERTIES.has(node.name.getText()) &&
      ts.isStringLiteralLike(node.initializer) &&
      looksLikeProse(node.initializer.text)
    ) {
      add(node.initializer, `property ${node.name.getText()}`, node.initializer.text)
    } else if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && TEXT_CALL.test(node.expression.text)) {
      for (const arg of node.arguments) {
        if (ts.isStringLiteralLike(arg) && looksLikeProse(arg.text)) add(arg, `call ${node.expression.text}`, arg.text)
      }
    } else if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
      isRenderedText(node) &&
      !ts.isJsxAttribute(node.parent) &&
      looksLikeProse(node.text)
    ) {
      add(node, 'jsx expression text', node.text)
    } else if (
      (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) &&
      looksSpanish(node.text) &&
      !inside(node, (n) => ts.isImportDeclaration(n) || ts.isExportDeclaration(n) || ts.isLiteralTypeNode(n))
    ) {
      add(node, 'spanish text', node.text)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return findings.sort((a, b) => a.line - b.line)
}
