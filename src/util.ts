import fs from "node:fs";
import path from "node:path";
import { JSDOM } from 'jsdom';
import { logger } from "./logger";
import { appConfig } from './config';
import axios, { AxiosError } from 'axios';
import { Carrier, CarrierData } from "./types";
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


export async function getScrapingWebsiteHTML() {
	try {
		const html = await axios.get(appConfig.scrapingUrl, {
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

export function transformHTMLToData(html: string): CarrierData {
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
