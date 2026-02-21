import {
  ensureSchemaExists,
  AppDataSource,
} from '../common/service/database/data-source';

async function run(): Promise<void> {
  await ensureSchemaExists();
  await AppDataSource.initialize();
  try {
    const executed = await AppDataSource.runMigrations();
    console.log(
      executed.length > 0
        ? `Migrations executadas: ${executed.map((m) => m.name).join(', ')}`
        : 'Nenhuma migration pendente.',
    );
  } finally {
    await AppDataSource.destroy();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
