import knex from 'knex';
import { Worker } from 'worker_threads';
import knexConfig from './knexfile.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const db = knex(knexConfig);

export function runMigrationsInWorker(force = true) {
  console.log('Starting database migrations in worker thread...');

  const worker = new Worker(path.join(__dirname, 'migrationWorker.js'));

  worker.on('message', (message) => {
    console.log('Migration worker:', message);
  });

  worker.on('error', (error) => {
    console.error('Migration worker error:', error.message);
  });

  worker.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Migration worker stopped with exit code ${code}`);
    } else {
      console.log('Migration worker completed successfully');
    }
  });

  worker.postMessage({ force });
}
