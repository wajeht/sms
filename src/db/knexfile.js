import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const developmentEnvironmentOnly = process.env.NODE_ENV === 'development';

const knexConfig = {
  client: 'better-sqlite3',
  useNullAsDefault: true,
  asyncStackTraces: false,
  connection: {
    filename: path.resolve(__dirname, 'sqlite', 'db.sqlite'),
  },
  migrations: {
    tableName: 'knex_migrations',
    directory: path.resolve(__dirname, './migrations'),
  },
  debug: developmentEnvironmentOnly,
  seeds: { directory: path.resolve(__dirname, './seeds') },
  pool: {
    min: 2,
    max: 10,
    acquireTimeoutMillis: 30000, // 30 seconds
    createTimeoutMillis: 30000, // 30 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    reapIntervalMillis: 1000, // 1 second
    afterCreate: (conn, done) => {
      try {
        // Enable foreign key constraints
        conn.pragma('foreign_keys = ON');

        // Use Write-Ahead Logging for better concurrency
        conn.pragma('journal_mode = WAL');

        // Set synchronous mode to NORMAL for better performance
        conn.pragma('synchronous = NORMAL');

        // Adjusts the number of pages in the memory cache
        conn.pragma('cache_size = 10000');

        // Stores temp objects in memory
        conn.pragma('temp_store = MEMORY');

        // Wait for 5000 ms before timing out
        conn.pragma('busy_timeout = 5000');

        // Enable multi-threaded operations (2 threads for 2 CPU cores)
        conn.pragma('threads = 2');

        done();
      } catch (err) {
        done(err);
      }
    },
  },
};

if (process.env.NODE_ENV === 'testing') {
  knexConfig.connection = {
    filename: ':memory:',
  };
}

export default knexConfig;
