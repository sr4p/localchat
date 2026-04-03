import { initializeDataSource } from './data-source'

async function main() {
  console.log('Initializing TypeORM DataSource...')
  const dataSource = await initializeDataSource()
  console.log('DataSource initialized successfully')
  console.log('Note: synchronize is set to false. Schema is managed via init.sql')
  await dataSource.destroy()
  console.log('DataSource destroyed. Schema sync complete.')
}

main().catch((error) => {
  console.error('Failed to sync schema:', error)
  process.exit(1)
})
