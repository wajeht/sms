import { carrierData, Cache } from './util';
import { Request, Response } from 'express';
const carrierCache = Cache<Awaited<ReturnType<typeof carrierData>>>();

// GET /healthz
export function getHealthzHandler(req: Request, res: Response) {
	res.status(200).send('ok');
}

// GET /
export async function getHomepageHandler(req: Request, res: Response) {
	let carriers = carrierCache.get('carriers');

	if (!carriers) {
		carriers = await carrierData();
		carrierCache.set('carriers', carriers);
	}

	return res.render('home.html', {
		carriers,
		lastUpdatedDate: new Date(new Date().setHours(0, 0, 0, 0)).toLocaleString(),
	});
}

// GET /privacy-policy
export function getPrivacyPolicyPageHandler(req: Request, res: Response) {
	return res.render('privacy-policy.html', { title: 'Privacy Policy' });
}

// GET /terms-of-service
export function getTermsOfServicePageHandler(req: Request, res: Response) {
	return res.render('terms-of-service.html', { title: 'Terms of Service' });
}

// GET /contact
export function getContactPageHandler(req: Request, res: Response) {
	return res.render('contact.html', { title: 'Contact' });
}
