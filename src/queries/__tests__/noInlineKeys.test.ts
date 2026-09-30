import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = join(__dirname, '..', '..')
const INLINE = /queryKey:\s*\[|refreshOnError:\s*\[\[/

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : files(path)
    return /\.tsx?$/.test(name) ? [path] : []
  })
}

describe('query keys', () => {
  it('are defined only in src/queries, never inline in screens, hooks or components', () => {
    const offenders = ['features', 'hooks', 'components']
      .flatMap((d) => files(join(SRC, d)))
      .filter((f) => INLINE.test(readFileSync(f, 'utf-8')))
    expect(offenders).toEqual([])
  })
})
