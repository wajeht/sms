import http from 'node:http';
import { app } from './app.js';
import { appConfig } from './config.js'
import { runMigrationsInWorker } from './db/db.js'

const httpServer = http.createServer(app);

async function startHttpServer() {
  console.log('Starting HTTP server...');

  httpServer.listen(appConfig.port, () => {
    console.log(`HTTP server listening at http://localhost:${appConfig.port}`);

    if (process.send) {
      process.send('ready');
    }

  });
}

function main() {
  console.log('Starting server initialization...');
  try {
    runMigrationsInWorker(true);

    console.log('Database migrations completed successfully');

    startHttpServer();

    console.log('Server startup complete');
  } catch (error) {
    console.error('Error during server startup:', error.message);
    process.exit(1);
  }
}


main()
