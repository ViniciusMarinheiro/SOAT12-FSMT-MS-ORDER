import { ColumnOptions } from 'typeorm'

const isTest = process.env.NODE_ENV === 'test'
const isCI = process.env.GITHUB_ACTIONS === 'true'

export const columnDate = (opts: ColumnOptions = {}): ColumnOptions => ({
  type: isTest && !isCI ? 'datetime' : 'timestamp',
  ...opts,
})
