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
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  for (const table of ['sessions']) {
		await knex.schema.dropTableIfExists(table);
	}
}
