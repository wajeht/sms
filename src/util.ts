import fs from 'node:fs';
import fastq from 'fastq';
import { db } from './db/db';
import path from 'node:path';
import { JSDOM } from 'jsdom';
import { logger } from './logger';
import axios, { AxiosError } from 'axios';
import { appConfig, phoneConfig } from './config';
import nodeCron, { ScheduledTask } from 'node-cron';
import { Carrier, CarrierData, CronJob } from './types';
import { Application, Request, Response, NextFunction } from 'express';

export class Cron {
	private crons: ScheduledTask[] = [];

	constructor(jobs: CronJob[]) {
		jobs.forEach((job) => this.schedule(job.expression, job.callback));
	}

	private schedule(cronExpression: string, callback: () => void): void {
		try {
			const task = nodeCron.schedule(cronExpression, callback);
			this.crons.push(task);
			logger.info('[Cron#schedule] Scheduled task with expression: %o', cronExpression);
		} catch (error) {
			logger.error('[Cron#schedule] Error scheduling task: %o', error);
		}
	}

	public start(): void {
		this.crons.forEach((cron) => {
			cron.start();
			logger.info('[Cron#start] Started task: %o', cron);
		});
	}

	public stop(): void {
		logger.info(`[Cron#stop] Stopping cron services...`);
		this.crons.forEach((cron) => {
			cron.stop();
			logger.info('[Cron#stop] Stopped task: %o', cron);
		});
	}
}

export function reload({
	app,
	watch,
	options = {},
}: {
	app: Application;
	watch: { path: string; extensions: string[] }[];
	options?: { pollInterval?: number; quiet?: boolean };
}): void {
	if (appConfig.env !== 'development') return;

	const pollInterval = options.pollInterval || 50;
	const quiet = options.quiet || false;
	let changeDetected = false;
	const lastContents = new Map<string, string>();

	watch.forEach(({ path: dir, extensions }) => {
		const extensionsSet = new Set(extensions);
		fs.watch(dir, { recursive: true }, (_: fs.WatchEventType, filename: string | null) => {
			if (filename && extensionsSet.has(filename.slice(filename.lastIndexOf('.')))) {
				try {
					const fullPath = path.join(dir, filename);
					const content = fs.readFileSync(fullPath, 'utf8');

					if (content !== lastContents.get(fullPath)) {
						lastContents.set(fullPath, content);

						if (!quiet) logger.info('[reload] File changed: %s', filename);
						changeDetected = true;
					}
				} catch {
					if (!quiet) logger.debug('[reload] Error reading file: %s', filename);
				}
			}
		});
	});

	app.get('/wait-for-reload', (req: Request, res: Response) => {
		const timer = setInterval(() => {
			if (changeDetected) {
				changeDetected = false;
				clearInterval(timer);
				res.send();
			}
		}, pollInterval);

		req.on('close', () => clearInterval(timer));
	});

	const clientScript = `
	<script>
		(async function poll() {
			try {
				await fetch('/wait-for-reload');
				location.reload();
			} catch {
				location.reload();
			}
		})();
	</script>\n\t`;

	app.use((_req: Request, res: Response, next: NextFunction) => {
		const originalSend = res.send.bind(res);

		res.send = function (body: string): Response {
			if (typeof body === 'string' && body.includes('</head>')) {
				body = body.replace('</head>', clientScript + '</head>');
			}

			return originalSend(body);
		};

		next();
	});
}

export async function getCarrierWebsiteHTML(url: string) {
	try {
		const html = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
				Accept:
					'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
				Connection: 'keep-alive',
				Referer: 'https://www.google.com/',
			},
		});

		return html.data; // Return the HTML content
	} catch (error) {
		logger.error(
			'[getCarrierWebsiteHTML] Error fetching carrier data %s',
			(error as AxiosError).message,
		);
		throw '';
	}
}

export function extractCarrierDataFromSourceTwo(html: string): CarrierData {
	try {
		const document = new JSDOM(html).window.document;
		const data: CarrierData = {};

		const rows = document.querySelectorAll('tbody tr');
		rows.forEach((row) => {
			const cells = row.querySelectorAll('td');
			if (cells.length >= 2) {
				const carrierName = cells[0]!.textContent?.trim() || '';
				const carrierEmail = cells[1]!.textContent?.trim() || '';

				const carrierKey = carrierName[0]!.toUpperCase();

				if (!data[carrierKey]) {
					data[carrierKey] = [];
				}

				const emailList = carrierEmail.includes('\n')
					? carrierEmail.split('\n').map((email) => email.trim())
					: [carrierEmail];

				data[carrierKey].push({
					name: carrierName,
					emails: emailList,
				});
			}
		});

		return data;
	} catch (error) {
		logger.error(
			'[extractCarrierDataFromSourceTwo] Error transforming html into carrier data data %o',
			error,
		);
		return {};
	}
}

export function extractCarrierDataFromSourceOne(html: string): CarrierData {
	try {
		const document = new JSDOM(html).window.document;
		const data: CarrierData = {};

		const container = document.getElementsByClassName('container-fluid-max')[0];

		if (!container) return data;

		let lastSection: Carrier[] | null = null;

		for (const element of container.children) {
			if (element.tagName === 'H3') {
				// Create a new section
				// const sectionId = element.querySelector('a.wpsal-anchor')?.id?.toUpperCase();
				const sectionId =
					element.querySelector('a.wpsal-anchor')?.parentElement?.parentElement?.lastChild
						?.textContent;

				if (sectionId) {
					lastSection = [];
					data[sectionId] = lastSection;
				}
			} else if (element.tagName === 'P' && lastSection) {
				// Add carrier or email pattern
				const content = element.textContent?.trim();

				if (!content) continue;

				if (!element.getAttribute('style')) {
					// No padding: Carrier name
					lastSection.push({ name: content, emails: [] });
				} else if (element.getAttribute('style') === 'padding-left: 30px;') {
					// Indented: Email pattern
					const lastCarrier = lastSection.at(-1);

					if (lastCarrier) lastCarrier.emails.push(content);
				}
			}
		}
		return data;
	} catch (error) {
		logger.error(
			'[extractCarrierDataFromSourceOne] Error transforming html into carrier data data %o',
			error,
		);
		return {};
	}
}

export async function combineCarrierDataFromSources(): Promise<CarrierData> {
	const data: CarrierData = {};

	try {
		const one = extractCarrierDataFromSourceOne(
			await getCarrierWebsiteHTML(phoneConfig.carrierWebsiteUrlOne),
		);

		const two = extractCarrierDataFromSourceTwo(
			await getCarrierWebsiteHTML(phoneConfig.carrierWebsiteUrlTwo),
		);

		// Merge data from the first source
		for (const key in one) {
			if (!data[key]) {
				data[key] = [];
			}
			one[key]!.forEach((carrier) => {
				const existingCarrier = data[key]!.find((c) => c.name === carrier.name);
				if (existingCarrier) {
					// Add new emails if not already present
					carrier.emails.forEach((email) => {
						if (!existingCarrier.emails.includes(email)) {
							existingCarrier.emails.push(email);
						}
					});
				} else {
					// Add new carrier
					data[key]!.push({ name: carrier.name, emails: [...carrier.emails] });
				}
			});
		}

		// Merge data from the second source
		for (const key in two) {
			if (!data[key]) {
				data[key] = [];
			}
			two[key]!.forEach((carrier) => {
				const existingCarrier = data[key]!.find((c) => c.name === carrier.name);
				if (existingCarrier) {
					// Add new emails if not already present
					carrier.emails.forEach((email) => {
						if (!existingCarrier.emails.includes(email)) {
							existingCarrier.emails.push(email);
						}
					});
				} else {
					// Add new carrier
					data[key]!.push({ name: carrier.name, emails: [...carrier.emails] });
				}
			});
		}

		return data;
	} catch (error) {
		logger.error('[combineCarrierDataFromSources] Failed to combine carrier data: %o', error);
		return {};
	}
}

export async function updateCarrier() {
	try {
		logger.info(`[updateCarrier] Updating carrier operation started`);

		const data = await combineCarrierDataFromSources();

		await db.transaction(async (trx) => {
			for (const key in data) {
				const categoryName = key.trim().toUpperCase();

				// Check if category exists
				let categoryRecord = await trx('categories').where('name', categoryName).first();

				// Insert category if it doesn't exist
				if (!categoryRecord) {
					[categoryRecord] = await trx('categories').insert({ name: categoryName }).returning('*');
				}

				for (const carrier of data[key]!) {
					// Check if this specific carrier exists
					const carrierExists = await trx('carriers')
						.where('name', carrier.name.trim())
						.where('category_id', categoryRecord.id)
						.first();

					let carrierId;
					// Only insert if the carrier does not exist
					if (!carrierExists) {
						const [insertedCarrier] = await trx('carriers')
							.insert({
								name: carrier.name.trim(),
								category_id: categoryRecord.id,
							})
							.returning('*');
						carrierId = insertedCarrier.id;
					} else {
						carrierId = carrierExists.id;
					}

					// Insert carrier emails if they don't already exist
					for (const email of carrier.emails) {
						const emailExists = await trx('carrier_emails')
							.where({
								email: email.trim(),
								carrier_id: carrierId,
							})
							.first();

						if (!emailExists) {
							await trx('carrier_emails').insert({
								email: email.trim(),
								carrier_id: carrierId,
							});
						}
					}
				}
			}
		});

		logger.info(`[updateCarrier] Carrier update completed successfully`);
	} catch (error) {
		logger.error('[updateCarrier] Error updating carrier: %o', error);
	}
}

export async function carrierData() {
	try {
		const results: { category: string; name: string; email: string }[] = await db.raw(`
		SELECT
			cat.name AS category,
			c.name AS name,
			ce.email
		FROM
			carriers AS c
		JOIN
			carrier_emails AS ce ON c.id = ce.carrier_id
		JOIN
			categories AS cat ON c.category_id = cat.id
		ORDER BY
			cat.name, c.name
	`);

		// Transform results into the desired structure
		const carriersData: { [key: string]: { name: string; emails: string[] }[] } = {};
		results.forEach(({ category, name, email }) => {
			if (!carriersData[category]) {
				carriersData[category] = [];
			}

			const carrierEntry = carriersData[category].find((carrier) => carrier.name === name);
			if (carrierEntry) {
				// If the carrier already exists, add the email if it's not already included
				if (!carrierEntry.emails.includes(email)) {
					carrierEntry.emails.push(email);
				}
			} else {
				// If the carrier does not exist, create a new entry
				carriersData[category].push({
					name,
					emails: [email], // Start with the first email
				});
			}
		});

		return { keys: Object.keys(carriersData), data: carriersData };
	} catch (error) {
		logger.error('[carrierData] Failed to combine carrier data: %o', error);
		return {};
	}
}

export const updateCarrierQueue = fastq.promise(updateCarrier, 10);
