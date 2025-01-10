import http from 'node:http';
import { app } from './app.js';

const server = http.createServer(app);

server.listen(80, () => {
  console.log(`app was started on http://localhost`);
})
