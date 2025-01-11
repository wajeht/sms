import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || 80),
}

export const sessionConfig = {
	secret: process.env.SESSION_SECRET || 'sms',
	domain: process.env.SESSION_DOMAIN || 'localhost',
};
