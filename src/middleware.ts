import helmet from 'helmet';
import { db } from './db/db';
import { logger } from './logger';
import { HttpError } from './error';
import { csrfSync } from 'csrf-sync';
import session from 'express-session';
import { sessionConfig, appConfig } from './config';
import { ConnectSessionKnexStore } from 'connect-session-knex';
import { Request, Response, NextFunction as Next } from 'express';

export function notFoundMiddleware() {
	return (req: Request, res: Response, _next: Next) => {
		if (req.path.startsWith('/api')) {
			res.status(404).json({
				message: 'Sorry, the resource you are looking for could not be found.',
				data: null,
			});
			return;
		}

		return res.status(404).render('error.html', {
			title: 'Not found',
			statusCode: 404,
			message: 'Sorry, the page you are looking for could not be found.',
		});
	};
}

export function errorMiddleware() {
	return (err: Error, req: Request, res: Response, _next: Next) => {
		let statusCode = 500;
		let message =
			'The server encountered an internal error or misconfiguration and was unable to complete your request';

		if (err instanceof HttpError) {
			statusCode = err.statusCode;
			message = err.message;
		}

		logger.error(
			`[errorMiddleware] error message: %s, status: %d, full error: %o`,
			err.message,
			statusCode,
			err,
		);

		if (req.path.startsWith('/api')) {
			res.status(statusCode).json({
				message,
				data: null,
			});
			return;
		}
		res.status(statusCode).render('error.html', {
			title: 'Error',
			statusCode,
			message,
		});
	};
}

export const csrfMiddleware = (() => {
	const { csrfSynchronisedProtection } = csrfSync({
		getTokenFromRequest: (req) => req.body.csrfToken || req.query.csrfToken,
	});

	return [
		csrfSynchronisedProtection,
		(req: Request, res: Response, next: Next) => {
			// @ts-expect-error - trust be bro
			res.locals.csrfToken = req.csrfToken();
			next();
		},
	];
})();

export function helmetMiddleware() {
	return helmet({
		contentSecurityPolicy: {
			useDefaults: true,
			directives: {
				...helmet.contentSecurityPolicy.getDefaultDirectives(),
				'default-src': ["'self'", 'plausible.jaw.dev', 'sms.jaw.dev', 'jaw.lol'],
				'script-src': [
					"'self'",
					"'unsafe-inline'",
					"'unsafe-eval'",
					'plausible.jaw.dev',
					'jaw.lol',
					'sms.jaw.dev',
				],
				'script-src-attr': ["'unsafe-inline'"],
				'form-action': ["'self'", '*'],
			},
		},
		referrerPolicy: {
			policy: 'strict-origin-when-cross-origin',
		},
	});
}

export function sessionMiddleware() {
	return session({
		secret: sessionConfig.secret,
		resave: false,
		saveUninitialized: false,
		store: new ConnectSessionKnexStore({
			knex: db,
			tableName: 'sessions',
			createTable: false,
		}),
		proxy: appConfig.env === 'production',
		cookie: {
			path: '/',
			domain: `.${sessionConfig.domain}`,
			maxAge: 1000 * 60 * 60 * 24 * 30, // 30 days
			httpOnly: appConfig.env === 'production',
			sameSite: 'lax',
			secure: appConfig.env === 'production',
		},
	});
}

export async function appLocalStateMiddleware(req: Request, res: Response, next: Next) {
	try {
		const isProd = appConfig.env === 'production';
		const randomNumber = Math.random();

		res.locals.state = {
			path: req.path,
			user: req.user ?? req.session.user,
			copyRightYear: new Date().getFullYear(),
			input: req.session?.input || {},
			errors: req.session?.errors || {},
			version: {
				style: isProd ? '0.20' : randomNumber,
				script: isProd ? '0.1' : randomNumber,
				plausible: isProd ? '0.0' : randomNumber,
			},
			env: appConfig.env,
			flash: {
				success: req.flash('success'),
				error: req.flash('error'),
				info: req.flash('info'),
				warning: req.flash('warning'),
			},
		};

		if (req.session) {
			delete req.session.input;
			delete req.session.errors;
		}

		next();
	} catch (error) {
		next(error);
	}
}
