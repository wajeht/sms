import fastq from 'fastq';
import { db } from './db/db';
import { JSDOM } from 'jsdom';
import { logger } from './logger';
import nodemailer from 'nodemailer';
import axios, { AxiosError } from 'axios';
import nodeCron, { ScheduledTask } from 'node-cron';
import { emailConfig, scrapeConfig } from './config';
import { Carrier, CarrierData, CronJob, SendEmailParams } from './types';

export const updateCarrierQueue = fastq.promise(updateCarrier, 10);
export const sendEmailQueue = fastq.promise(sendEmail, 10);

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<void> {
	const transporter = nodemailer.createTransport({
		host: emailConfig.host,
		port: emailConfig.port,
		auth: {
			user: emailConfig.auth.user,
			pass: emailConfig.auth.pass,
		},
	});

	try {
		const info = await transporter.sendMail({
			from: emailConfig.alias,
			to,
			subject,
			html,
		});

		logger.info(`[sendEmail]: Email sent successfully to: ${to}`, { messageId: info.messageId });
	} catch (error) {
		logger.error('[sendEmail]: Error sending email', {
			to,
			subject,
			error: error instanceof Error ? error.message : 'Unknown error',
			stack: error instanceof Error ? error.stack : undefined,
		});

		// throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
	}
}

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

// TODO: improve performance
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
					emails: emailList.filter((email) => email.includes('@')),
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
			'[extractCarrierDataFromSourceOne] Error transforming html into carrier data %o',
			error,
		);
		return {};
	}
}

// TODO: improve performance
export function extractCarrierDataFromSourceThree(
	data: {
		carrier: string;
		'email-to-sms': string;
		'email-to-mms': string;
	}[],
): CarrierData {
	try {
		const carrierData: CarrierData = {};

		for (const d of data) {
			const carrierName = d.carrier;
			const category = carrierName[0]?.toUpperCase() ?? '';
			const emailsToAdd = [d['email-to-sms'], d['email-to-mms']];

			if (!carrierData[category]) {
				carrierData[category] = [];
			}

			let carrier = carrierData[category].find((c) => c.name === carrierName);
			if (!carrier) {
				carrier = { name: carrierName, emails: [] };
				carrierData[category].push(carrier);
			}

			for (const email of emailsToAdd) {
				if (email?.includes('@') && !carrier.emails.includes(email)) {
					carrier.emails.push(email);
				}
			}
		}

		return carrierData;
	} catch (error) {
		logger.error(
			'[extractCarrierDataFromSourceThree] Error transforming data into carrier data %o',
			error,
		);
		return {};
	}
}

// TODO: improve performance
async function combineCarrierDataFromSources(): Promise<CarrierData> {
	const data: CarrierData = {};

	try {
		const one = extractCarrierDataFromSourceOne(
			await getCarrierWebsiteHTML(scrapeConfig.carrierWebsiteUrlOne),
		);

		const two = extractCarrierDataFromSourceTwo(
			await getCarrierWebsiteHTML(scrapeConfig.carrierWebsiteUrlTwo),
		);

		const three = extractCarrierDataFromSourceThree(
			await getCarrierWebsiteHTML(scrapeConfig.carrierWebsiteUrlThree),
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

		// Merge data from the second source
		for (const key in three) {
			if (!data[key]) {
				data[key] = [];
			}
			three[key]!.forEach((carrier) => {
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

// TODO: improve performance
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

// TODO: improve performance
export async function carrierData() {
	try {
		const results: { category: string; name: string; email: string }[] = await db
			.select({
				category: 'cat.name',
				name: 'c.name',
				email: 'ce.email',
			})
			.from('carriers as c')
			.join('carrier_emails as ce', 'c.id', 'ce.carrier_id')
			.join('categories as cat', 'c.category_id', 'cat.id')
			.orderBy(['cat.name', 'c.name']);

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
