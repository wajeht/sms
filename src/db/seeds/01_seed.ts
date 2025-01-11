import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '..', '..', '.env')) });

export async function seed(knex) {
	await knex('users').del();
	await knex('sessions').del();
}
