import { Request, Response } from 'express';
import { carrierData, updateCarrierQueue } from './util';
import { db } from './db/db';

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
	const result = (await db.raw(`
		SELECT
			cat.id AS category_id,
			cat.name AS category,
			json_group_array(
				json_object(
					'id', c.id,
					'name', c.name
				)
			) AS carriers
		FROM
			categories AS cat
		LEFT JOIN
			carriers AS c ON c.category_id = cat.id
		GROUP BY
			cat.id,
			cat.name
		ORDER BY
			cat.name ASC
	`)) as any[];

	res.json({
		data: result.map((row) => ({
			id: row.category_id,
			name: row.category,
			carriers: JSON.parse(row.carriers),
		})),
	});
}

// GET /api/categories/:name
export async function getAPICategoriesNameHandler(req: Request, res: Response) {
	const result = (await db.raw(
		`
			SELECT
					cat.id AS category_id,
					cat.name AS category,
					json_group_array(
							json_object(
									'id', c.id,
									'name', c.name
							)
					) AS carriers
			FROM
					categories AS cat
			LEFT JOIN
					carriers AS c ON c.category_id = cat.id
			WHERE
					cat.name LIKE ?
			GROUP BY
					cat.id,
					cat.name
	`,
		[`%${req.params.name?.trim()}%`],
	)) as any[];

	res.json({
		data: {
			id: result[0].category_id,
			name: result[0].category,
			carriers: JSON.parse(result[0].carriers),
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
		data: result.map((row) => ({
			...row,
			emails: JSON.parse(row.emails),
		})),
	});
}

// GET /api/carriers/:id
export async function getAPICarriersNameHandler(req: Request, res: Response) {
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

	res.json({
		data: {
			...result,
			emails: JSON.parse(result.emails),
		},
	});
}

// GET /api/emails
export async function getAPIEmailsHandler(req: Request, res: Response) {
	res.json({
		data: await db.select('email').from('carrier_emails'),
	});
}
