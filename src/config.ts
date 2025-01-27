import dotenv from 'dotenv';
import path from 'node:path';
import { Env } from './types';

dotenv.config({ path: path.resolve(path.join(process.cwd(), '.env')) });

export const appConfig = {
	port: parseInt(process.env.APP_PORT || '80', 10),
	appUrl: process.env.APP_URL || 'localhost',
	env: (process.env.NODE_ENV as Env) || 'development',
	adminEmail: process.env.APP_ADMIN_EMAIL || '',
} as const;

export const scrapeConfig = {
	carrierWebsiteUrlOne: process.env.CARRIER_WEBSITE_URL_ONE || '',
	carrierWebsiteUrlTwo: process.env.CARRIER_WEBSITE_URL_TWO || '',
	carrierWebsiteUrlThree: process.env.CARRIER_WEBSITE_URL_THREE || '',
} as const;

export const sessionConfig = {
	secret: process.env.SESSION_SECRET || 'sms',
	domain: process.env.SESSION_DOMAIN || 'localhost',
} as const;

export const emailConfig = {
	host: process.env.EMAIL_HOST || '',
	port: parseInt(process.env.EMAIL_PORT || '0', 10),
	alias: process.env.EMAIL_ALIAS || '',
	auth: {
		user: process.env.EMAIL_AUTH_EMAIL || '',
		pass: process.env.EMAIL_AUTH_PASS || '',
	},
} as const;
