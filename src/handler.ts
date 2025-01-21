import { db } from './db/db';
import { NotFoundError } from './error';
import { Request, Response } from 'express';
import { carrierData, updateCarrierQueue } from './util';

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

// POST /phone
export async function postPhonePageHandler(req: Request, res: Response) {
	return res.redirect(`/phone/${req.body.number}`);
}

// GET /phone
export async function getPhonePageHandler(req: Request, res: Response) {
	return res.render('phone.html', { title: 'Phone' });
}

// GET /update
export async function getUpdateHandler(req: Request, res: Response) {
	updateCarrierQueue.push({});

	try {
		if (req.headers?.referer) {
			const refererUrl = new URL(req.headers.referer);
			if (refererUrl.pathname === req.path) {
				return res.redirect(req.headers.referer);
			}
		}
	} catch {
		return res.redirect('/');
	}

	return res.redirect('/');
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

// GET /api/categories
export async function getAPICategoriesHandler(req: Request, res: Response) {
	const result = await db
		.select(
			'categories.id as category_id',
			'categories.name as category',
			db.raw("json_group_array(json_object('id', carriers.id, 'name', carriers.name)) as carriers"),
		)
		.from('categories')
		.leftJoin('carriers', 'carriers.category_id', 'categories.id')
		.groupBy('categories.id', 'categories.name')
		.orderBy('categories.name');

	res.json({
		message: 'categories retrieved successfully',
		data: result.map((row) => ({
			id: row.category_id,
			name: row.category,
			carriers: JSON.parse(row.carriers),
		})),
	});
}

// GET /api/categories/:name
export async function getAPICategoryNameHandler(req: Request, res: Response) {
	const result = await db
		.select(
			'categories.id as category_id',
			'categories.name as category',
			db.raw("json_group_array(json_object('id', carriers.id, 'name', carriers.name)) as carriers"),
		)
		.from('categories')
		.leftJoin('carriers', 'carriers.category_id', 'categories.id')
		.whereLike('categories.name', `%${req.params.name?.trim()}%`)
		.groupBy('categories.id', 'categories.name')
		.first();

	if (!result) {
		throw new NotFoundError('Sorry, the resource you are looking for could not be found.');
	}

	res.json({
		message: 'category retrieved successfully',
		data: {
			id: result.category_id,
			name: result.category,
			carriers: JSON.parse(result.carriers),
		},
	});
}

// GET /api/carriers
export async function getAPICarriersHandler(req: Request, res: Response) {
	const result = await db
		.select(
			'carriers.id',
			'carriers.name',
			db.raw(
				"json_group_array(json_object('id', carrier_emails.id, 'email', carrier_emails.email)) as emails",
			),
		)
		.from('carriers')
		.leftJoin('carrier_emails', 'carriers.id', 'carrier_emails.carrier_id')
		.groupBy('carriers.id', 'carriers.name')
		.orderBy('carriers.name');

	res.json({
		message: 'carriers retrieved successfully',
		data: result.map((row) => ({
			...row,
			emails: JSON.parse(row.emails),
		})),
	});
}

// GET /api/carriers/:id
export async function getAPICarrierIDHandler(req: Request, res: Response) {
	const result = await db
		.select(
			'carriers.id',
			'carriers.name',
			db.raw(
				"json_group_array(json_object('id', carrier_emails.id, 'email', carrier_emails.email)) as emails",
			),
		)
		.from('carriers')
		.leftJoin('carrier_emails', 'carriers.id', 'carrier_emails.carrier_id')
		.where('carriers.id', req.params.id)
		.groupBy('carriers.id', 'carriers.name')
		.first();

	if (!result) {
		throw new NotFoundError('Sorry, the resource you are looking for could not be found.');
	}

	res.json({
		message: 'carrier retrieved successfully',
		data: {
			...result,
			emails: JSON.parse(result.emails),
		},
	});
}

// GET /api/emails
export async function getAPIEmailsHandler(req: Request, res: Response) {
	res.json({
		message: 'emails retrieved successfully',
		data: await db.select('id', 'email').from('carrier_emails'),
	});
}
