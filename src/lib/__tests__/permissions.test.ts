import { describe, expect, it } from 'vitest'
import { can, type Permission } from '../permissions'

const caps = (...capabilities: string[]) => ({ capabilities })
const SERVER_PERMISSIONS: Permission[] = ['organizations.review', 'users.manage', 'catalogs.manage', 'audit.read']

describe('can()', () => {
  it('grants exactly the capabilities the server announced', () => {
    const subject = caps('users.manage', 'audit.read')
    expect(can(subject, 'users.manage')).toBe(true)
    expect(can(subject, 'audit.read')).toBe(true)
    expect(can(subject, 'organizations.review')).toBe(false)
    expect(can(subject, 'catalogs.manage')).toBe(false)
  })

  it('lets any signed-in account open the home screen, even without capabilities', () => {
    expect(can(caps(), 'home.view')).toBe(true)
  })

  it('grants nothing to an account without capabilities', () => {
    SERVER_PERMISSIONS.forEach((permission) => expect(can(caps(), permission)).toBe(false))
  })

  it('grants nothing when signed out', () => {
    expect(can(null, 'home.view')).toBe(false)
    expect(can(undefined, 'users.manage')).toBe(false)
  })

  it('does not treat an unknown capability as a permission the UI knows', () => {
    expect(can(caps('something.new'), 'users.manage')).toBe(false)
  })
})
