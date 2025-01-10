import http from 'node:http';
import { app } from './app.js';
import { appConfig } from './config.js'

const server = http.createServer(app);

server.listen(appConfig.port, () => {
  console.log(`app was started on http://localhost`);
})
