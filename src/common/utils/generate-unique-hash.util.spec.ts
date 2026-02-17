import { generateUniqueHash } from './generate-unique-hash.util'

describe('generateUniqueHash', () => {
  it('should generate a unique hash', () => {
    const hash1 = generateUniqueHash()
    const hash2 = generateUniqueHash()

    expect(hash1).toBeDefined()
    expect(hash2).toBeDefined()
    expect(hash1).not.toBe(hash2)
    expect(typeof hash1).toBe('string')
    expect(hash1.length).toBe(64)
  })

  it('should generate hash with custom length', () => {
    const hash = generateUniqueHash(16)

    expect(hash).toBeDefined()
    expect(hash.length).toBe(16)
    expect(typeof hash).toBe('string')
  })

  it('should generate different hashes on each call', () => {
    const hashes = new Set()
    for (let i = 0; i < 10; i++) {
      hashes.add(generateUniqueHash())
    }

    expect(hashes.size).toBe(10)
  })

  it('should return full hash when length is 0', () => {
    const hash = generateUniqueHash(0)

    expect(hash).toBeDefined()
    expect(hash.length).toBe(64)
  })
})
