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

	await knex.schema.createTable('carriers', (table) => {
		table.increments('id').primary();
		table.string('name').notNullable();
		table.string('category', 1).notNullable();
		table.timestamps(true, true);

		table.index('name');
		table.index('category');
});

await knex.schema.createTable('carrier_emails', (table) => {
	table.increments('id').primary();
		table.string('carrier_id', 255).notNullable();
		table.string('email').notNullable();
		table.foreign('carrier_id').references('id').inTable('carriers').onDelete('CASCADE');

		table.index('carrier_id');
		table.index('email');
});
}

export async function down(knex: Knex): Promise<void> {
	for (const table of ['carrier_emails', 'carriers', 'users', 'sessions']) {
		await knex.schema.dropTableIfExists(table);
	}
}
