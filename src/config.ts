import dotenv from 'dotenv';
import path from 'node:path';
import { Env } from './types';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = {
	port: parseInt(process.env.APP_PORT || '80', 10),
  appUrl: process.env.APP_URL || 'localhost',
	env: (process.env.NODE_ENV as Env) || 'development',
	adminEmail: process.env.APP_ADMIN_EMAIL || '',
}

export const phoneConfig = {
	carrierWebsiteUrlOne: process.env.CARRIER_WEBSITE_URL_ONE || '',
	carrierWebsiteUrlTwo: process.env.CARRIER_WEBSITE_URL_TWO || '',
	phoneLookupURL: process.env.PHONE_LOOKUP_URL || ''
}

export const sessionConfig = {
	secret: process.env.SESSION_SECRET || 'sms',
	domain: process.env.SESSION_DOMAIN || 'localhost',
};
