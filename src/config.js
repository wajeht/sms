import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = {
  env: process.env.NODE_ENV,
  port: parseInt(process.env.PORT || 80),
}
