import fs from "node:fs";
import path from "node:path";
import { appConfig } from './config';
import { Application, Request, Response, NextFunction } from 'express';
import { logger } from "./logger";

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

		res.send = function (body: any): Response {
			if (typeof body === 'string' && body.includes('</head>')) {
				body = body.replace('</head>', clientScript + '</head>');
			}
			return originalSend(body);
		};

		next();
	});
}
