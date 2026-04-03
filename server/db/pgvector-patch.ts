// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PostgresDriver } = require('typeorm/driver/postgres/PostgresDriver')
import type { TableColumn } from 'typeorm'

const originalCreateFullType = PostgresDriver.prototype.createFullType

PostgresDriver.prototype.createFullType = function (column: TableColumn): string {
  const typeStr = column.type as string
  if (typeStr === 'vector') {
    const columnObj = column as unknown as Record<string, { length?: number } | undefined>
    const typeOptions = columnObj.typeOptions
    if (typeOptions?.length) {
      return `vector(${typeOptions.length})`
    }
  }
  return originalCreateFullType.call(this, column)
}
