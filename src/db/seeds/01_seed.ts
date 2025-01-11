import dotenv from 'dotenv';
import { Knex } from 'knex';
import path from 'node:path';

const env = dotenv.config({ path: path.resolve(path.join(process.cwd(), '..', '..', '.env')) });

export async function seed(knex: Knex): Promise<void> {
	await knex('users').del();
	await knex('sessions').del();

	// Create admin user
	await knex('users')
		.insert({
			username: env.parsed?.APP_ADMIN_EMAIL?.split('@')[0],
			email: env.parsed?.APP_ADMIN_EMAIL,
			is_admin: true,
		})
}
