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

    await knex.schema.createTable('categories', (table) => {
        table.increments('id').primary();
        table.string('name', 1).unique().notNullable();
        table.timestamps(true, true);

        table.index('name');
    });

    await knex.schema.createTable('carriers', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.integer('category_id').unsigned().references('id').inTable('categories').onDelete('CASCADE');
        table.timestamps(true, true);

        table.index('name');
        table.index('category_id');

        table.unique(['name', 'category_id']);
    });

    await knex.schema.createTable('carrier_emails', (table) => {
        table.increments('id').primary();
        table.string('email').notNullable();
        table.integer('carrier_id').unsigned().references('id').inTable('carriers').onDelete('NO ACTION');
        table.timestamps(true, true);

        table.index('carrier_id');
        table.index('email');

        table.unique(['email', 'carrier_id']);
    });
}

export async function down(knex: Knex): Promise<void> {
    for (const table of ['carrier_emails', 'carriers', 'categories', 'users', 'sessions']) {
        await knex.schema.dropTableIfExists(table);
    }
}
