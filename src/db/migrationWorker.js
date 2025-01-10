import knex from 'knex';
import path from 'node:path';
import { fileURLToPath } from 'url';
import knexConfig from './knexfile.js';
import { parentPort } from 'worker_threads';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = knex(knexConfig);

async function runMigrations(force = false) {
  try {
    if (process.env.NODE_ENV !== 'production' && force !== true) {
      parentPort.postMessage('Cannot run auto database migration on non-production');
      return;
    }

    const config = {
      directory: path.resolve(path.join(__dirname, 'migrations')),
    };

    const version = await db.migrate.currentVersion();

    parentPort.postMessage(`Current database version ${version}`);

    parentPort.postMessage('Checking for database upgrades');

    const [batchNo, migrations] = await db.migrate.latest(config);

    if (migrations.length === 0) {
      parentPort.postMessage('Database upgrade not required');
      return;
    }

    migrations.forEach(migration => {
      parentPort.postMessage(`Database upgrade completed for ${migration}`);
    });

    parentPort.postMessage(`Batch ${batchNo} run: ${migrations.length} migrations`);

  } catch (error) {
    parentPort.postMessage(`Error running migrations: ${error.message}`);
    throw error;
  } finally {
    await db.destroy();
  }
}

parentPort.on('message', ({ force }) => {
  runMigrations(force)
    .then(() => {
      parentPort.postMessage('Migrations completed successfully');
      parentPort.close();
    })
    .catch((error) => {
      parentPort.postMessage(`Fatal error in migrations: ${error.message}`);
      process.exit(1);
    });
});
