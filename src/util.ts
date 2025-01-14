import fs from "node:fs";
import path from "node:path";
import { JSDOM } from 'jsdom';
import { logger } from "./logger";
import axios, { AxiosError } from 'axios';
import { Carrier, CarrierData } from "./types";
import { appConfig, phoneConfig } from './config';
import nodeCron, { ScheduledTask} from 'node-cron';
import { Application, Request, Response, NextFunction } from 'express';

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
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
				'Accept-Language': 'en-US,en;q=0.9',
				'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
				'Connection': 'keep-alive',
				'Referer': 'https://www.google.com/',
			},
		});

		return html.data; // Return the HTML content
	} catch (error) {
		logger.error('Error fetching carrier data %s', (error as AxiosError).message);
		throw error;
	}
}

export async function getPhoneCarrierInfo(phoneNumber: number) {
	try {
		const html = await axios.get(phoneConfig.phoneLookupURL);
		return html.data;
	} catch (error) {
		logger.error('Error fetching carrier data %s', (error as AxiosError).message);
		throw error;
	}
}

export function transformCarrierTwoHTMLToCarrierData(html: string): CarrierData {
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

        data[carrierKey].push({
          name: carrierName,
          emails: [carrierEmail]
        });
      }
    });

    return data;
  } catch (error) {
    console.error('Error transforming HTML into carrier data', error);
    return {};
  }
}

export function transformCarrierOneHTMLToCarrierData(html: string): CarrierData {
	try {
		const document = new JSDOM(html).window.document;
		const data: CarrierData = {};

		const container = document.getElementsByClassName('container-fluid-max')[0];

		if (!container) return data;

		let lastSection: Carrier[] | null = null;

		for (const element of container.children) {
			if (element.tagName === 'H3') {
				// Create a new section
				const sectionId = element.querySelector('a.wpsal-anchor')?.id?.toUpperCase();

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
		logger.error('Error transforming html into carrier data data %o', error);
		return {}
	}
}

export async function updateCarrier() {
	try {
		logger.info(`[updateCarrier] updating carrier operation started`);
	} catch(error){
		logger.error('[updateCarrier] error updating carrier o%', error);
	}
}

type CronJob = {
	expression: string;
	callback: () => void;
};

export class Cron {
	private crons: ScheduledTask[] = [];

	constructor(jobs: CronJob[]) {
			jobs.forEach(job => this.schedule(job.expression, job.callback));
	}

	private schedule(cronExpression: string, callback: () => void): void {
			try {
					const task = nodeCron.schedule(cronExpression, callback);
					this.crons.push(task);
					logger.info(`[Cron] Scheduled task with expression: ${cronExpression}`);
			} catch (error) {
					logger.error(`[Cron] Error scheduling task: ${error}`);
			}
	}

	public start(): void {
			this.crons.forEach((cron) => {
					cron.start();
					logger.info(`[Cron] Started task: ${cron}`);
			});
	}

	public stop(): void {
			logger.info(`[Cron] Stopping cron services...`);
			this.crons.forEach((cron) => {
					cron.stop();
					logger.info(`[Cron] Stopped task: ${cron}`);
			});
	}
}

export const CronJobs = new Cron([
	{ expression: '0 0 * * *', callback: updateCarrier },
]);
