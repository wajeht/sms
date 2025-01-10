/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
	await knex.schema.createTable('sessions', (table) => {
		table.string('sid', 255).primary().notNullable();
		table.json('sess').notNullable();
		table.timestamp('expired').notNullable();
		table.index(['expired'], 'sessions_expired_index');
	});

	await knex.schema.createTable('users', (table) => {
		table.increments('id').primary();
		table.string('username').unique().notNullable();
		table.string('email').unique().notNullable();
		table.boolean('is_admin').defaultTo(false);
		table.string('api_key').unique().nullable();
		table.integer('api_key_version').defaultTo(0).notNullable();
		table.timestamp('api_key_created_at').nullable();
		table.timestamps(true, true);
		table.index('api_key');
		table.index(['email', 'is_admin', 'username']);
	});
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  for (const table of ['users','sessions']) {
		await knex.schema.dropTableIfExists(table);
	}
}
