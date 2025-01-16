import { carrierData, updateCarrier } from './util';
import { Request, Response } from 'express';

// GET /healthz
export function getHealthzHandler(req: Request, res: Response) {
	res.status(200).send('ok');
}

// GET /
export async function getHomepageHandler(req: Request, res: Response) {
	return res.render('home.html', {
		carriers: await carrierData(),
		lastUpdatedDate: new Date(new Date().setHours(0, 0, 0, 0)).toLocaleString(),
	});
}

// GET /update
export async function getUpdateHandler(req: Request, res: Response) {
	await updateCarrier();
	return res.redirect('back');
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
export function getAPIPageHandler(req: Request, res: Response) {
	return res.render('api.html', { title: 'API' });
}
