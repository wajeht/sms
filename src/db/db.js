import knex from 'knex';
import { appConfig } from '../config.js';
import knexConfig from './knexfile.js';
import path from 'node:path';

export const db = knex(knexConfig);

export async function runMigrations(force = false) {
	try {
		if (appConfig.env !== 'production' && force !== true) {
			console.info('cannot run auto database migration on non production');
			return;
		}

		const config = {
			directory: path.resolve(path.join(process.cwd(), 'src', 'db', 'migrations')),
		};

		const version = await db.migrate.currentVersion();

		console.info(`current database version ${version}`);

		console.info(`checking for database upgrades`);

		const [batchNo, migrations] = await db.migrate.forceFreeMigrationsLock(config);

		if (migrations.length === 0) {
			console.info('database upgrade not required');
			return;
		}

		const migrationList = migrations
			.map((migration ) => migration.split('_')[1].split('.')[0])
			.join(', ');

		console.info(`database upgrades completed for ${migrationList} schema`);

		console.info(`batch ${batchNo} run: ${migrations.length} migrations`);
	} catch (error) {
		console.error('error running migrations', error);
		throw error;
	}
}
