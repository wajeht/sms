import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = {
  env: process.env.APP_ENV || "development",
  port: parseInt(process.env.APP_PORT || '80', 10),
  adminEmail: process.env.APP_ADMIN_EMAIL || '',
}

export const sessionConfig = {
	secret: process.env.SESSION_SECRET || 'sms',
	domain: process.env.SESSION_DOMAIN || 'localhost',
};
