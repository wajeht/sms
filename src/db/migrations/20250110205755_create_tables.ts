import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
	await knex.schema.createTable('sessions', (table) => {
		table.string('sid', 255).primary().notNullable();
		table.json('sess').notNullable();
		table.timestamp('expired').notNullable();

		table.index(['sid']);
	});

	await knex.schema.createTable('users', (table) => {
		table.increments('id').primary();
		table.string('username').unique().notNullable();
		table.string('email').unique().notNullable();
		table.boolean('is_admin').defaultTo(false);
		table.timestamps(true, true);

		table.index(['email', 'is_admin', 'username']);
	});
}

export async function down(knex: Knex): Promise<void> {
	for (const table of ['users', 'sessions']) {
		await knex.schema.dropTableIfExists(table);
	}
}
