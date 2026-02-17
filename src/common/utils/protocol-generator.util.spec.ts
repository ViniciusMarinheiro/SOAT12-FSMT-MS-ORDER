import { ProtocolGenerator } from './protocol-generator.util'

describe('ProtocolGenerator', () => {
  it('should generate protocol with current year', () => {
    const currentYear = new Date().getFullYear()
    const protocol = ProtocolGenerator.generateProtocol(1)

    expect(protocol).toBeDefined()
    expect(protocol).toContain(`OS-${currentYear}-`)
    expect(protocol).toContain('00001')
  })

  it('should pad id with zeros', () => {
    const protocol = ProtocolGenerator.generateProtocol(123)

    expect(protocol).toContain('00123')
  })

  it('should handle single digit id', () => {
    const protocol = ProtocolGenerator.generateProtocol(5)

    expect(protocol).toContain('00005')
  })

  it('should handle large id', () => {
    const protocol = ProtocolGenerator.generateProtocol(99999)

    expect(protocol).toContain('99999')
  })

  it('should generate different protocols for different ids', () => {
    const protocol1 = ProtocolGenerator.generateProtocol(1)
    const protocol2 = ProtocolGenerator.generateProtocol(2)

    expect(protocol1).not.toBe(protocol2)
  })
})

