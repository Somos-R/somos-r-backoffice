import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { findHardcodedText } from '../test/hardcodedText'

// All user-visible text lives in src/assets/i18n/es.json and is read through `t`. This test scans
// the source for Spanish written directly in the code, so it fails CI instead of slipping in.

const SRC = join(process.cwd(), 'src')
const SKIPPED_DIRS = new Set(['__tests__', 'test', 'assets'])

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) sourceFiles(full, out)
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

describe('no hardcoded UI text', () => {
  it('every user-visible string comes from es.json', () => {
    const offenders = sourceFiles(SRC).flatMap((file) =>
      findHardcodedText(readFileSync(file, 'utf8'), file).map(
        (f) => `${relative(process.cwd(), file).replace(/\\/g, '/')}:${f.line}  [${f.kind}]  ${f.text.slice(0, 70)}`,
      ),
    )
    // On failure the list says exactly where: move each string into es.json and use t.<section>.<key>.
    expect(offenders).toEqual([])
  })
})

describe('the scanner itself (so a passing scan means something)', () => {
  const found = (code: string) => findHardcodedText(code)

  it('flags text between JSX tags', () => {
    expect(found('const A = () => <button>Guardar cambios</button>')).toHaveLength(1)
    expect(found('const A = () => <p>Nuevo pesaje</p>')).toHaveLength(1)
  })

  it('flags text-like attributes', () => {
    expect(found('const A = () => <Input label="Precio por kg" />')).toHaveLength(1)
    expect(found('const A = () => <Input placeholder="Buscar reciclador" helperText="Umbral de alerta" />')).toHaveLength(2)
    expect(found('const A = () => <IconButton aria-label="Cerrar" />')).toHaveLength(1)
  })

  it('flags text in message-like properties and error setters', () => {
    expect(found("setSnackbar({ open: true, message: 'Ítem actualizado correctamente' })")).toHaveLength(1)
    expect(found("setEditError('Error al actualizar')")).toHaveLength(1)
  })

  it('flags Spanish inside ternaries, templates and fallbacks, wherever it appears', () => {
    expect(found("const A = () => <Button>{busy ? 'Guardando cambios' : 'Guardar cambios'}</Button>")).toHaveLength(2)
    expect(found("const A = () => <p>{name ?? 'Sin nombre registrado'}</p>")).toHaveLength(1)
    expect(found("const A = () => <p>{ok && 'Todo listo'}</p>")).toHaveLength(1)
    expect(found("const s = pending ? 'Guardando cambios' : t.common.save")).toEqual([]) // not rendered here: cannot tell
    expect(found('const s = `${count} pendientes de la semana`')).toHaveLength(1)
    expect(found("const s = 'No hay pesajes registrados aún'")).toHaveLength(1)
    expect(found("const s = 'Se cancelará esta venta'")).toHaveLength(1)
  })

  it('does not flag text that comes from the dictionary', () => {
    expect(found('const A = () => <button>{t.common.save}</button>')).toEqual([])
    expect(found('const A = () => <Input label={t.pesajes.drawer.kg} />')).toEqual([])
    expect(found('const A = () => <Input label={`${t.pesajes.drawer.kg} *`} />')).toEqual([])
    expect(found('setEditError(t.inventario.updateError)')).toEqual([])
  })

  it('does not flag code that is not UI text', () => {
    const code = `
      import { t } from '../../lib/i18n'
      type Status = 'pending_validation' | 'validated'
      const a = { variant: 'outlined', color: 'error', to: '/recicladores', name: 'full_name' }
      const b = <Box className="flex items-center" sx={{ display: 'flex' }} data-testid="x" />
      const c = apiClient.get('/weighings', { params: { status: 'validated' } })
      const d = new Date().toLocaleDateString('es-CO', { day: '2-digit' })
      throw new Error('No active session')
      const e = 'Content-Type'
      // Guardar los cambios (a comment, not UI text)
    `
    expect(found(code)).toEqual([])
  })

  it('does not flag strings inside JSX braces that are not rendered as text', () => {
    expect(found("const A = () => <Box sx={{ display: 'flex' }} onClick={() => go('/recicladores')} />")).toEqual([])
    expect(found("const A = () => <Select value={mode === 'edit' ? 'draft' : 'final'} />")).toEqual([])
    expect(found("const A = () => <p>{items.map((i) => i.name).join(', ')}</p>")).toEqual([])
  })

  it('does not flag symbols, numbers or short tokens', () => {
    expect(found('const A = () => <span>—</span>')).toEqual([])
    expect(found('const A = () => <span>kg</span>')).toEqual([])
    expect(found("const s = '$'")).toEqual([])
  })

  it('reports the line of each finding', () => {
    const code = "const a = 1\nconst b = 2\nconst c = 'No hay datos disponibles'"
    expect(found(code)[0]).toMatchObject({ line: 3, kind: 'spanish text' })
  })
})
