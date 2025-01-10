import http from 'node:http';
import { app } from './app.js';
import { runMigrations } from './db/db.js'
import { appConfig } from './config.js'

const server = http.createServer(app);

server.listen(appConfig.port, async () => {
  if (appConfig.env === 'production') {
    await runMigrations();
  }

  console.log(`server was started on http://localhost:${appConfig.port}`);
});
