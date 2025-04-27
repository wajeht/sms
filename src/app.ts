import {
	errorMiddleware,
	notFoundMiddleware,
	appLocalStateMiddleware,
	sessionMiddleware,
	helmetMiddleware,
	rateLimitMiddleware,
} from './middleware';
import ejs from 'ejs';
import cors from 'cors';
import express from 'express';
import flash from 'connect-flash';
import { router } from './router';
import compression from 'compression';
import { appConfig } from './config';
import expressLayouts from 'express-ejs-layouts';
import { expressTemplatesReload as reload } from '@wajeht/express-templates-reload';

const app = express()
	.set('trust proxy', true)
	.use(sessionMiddleware())
	.use(flash())
	.use(compression())
	.use(cors())
	.use(helmetMiddleware())
	.use(rateLimitMiddleware())
	.use(express.json({ limit: '100kb' }))
	.use(express.urlencoded({ extended: true, limit: '100kb' }))
	.use(express.static('./public', { maxAge: '30d', etag: true, lastModified: true }))
	.engine('html', ejs.renderFile)
	.set('view engine', 'html')
	.set('view cache', appConfig.env === 'production')
	.set('views', './src/views/pages')
	.set('layout', '../layouts/public.html')
	.use(expressLayouts)
	.use(appLocalStateMiddleware);

if (appConfig.env === 'development') {
	reload({
		app,
		watch: [
			{ path: './public/script.js' },
			{ path: './public/style.css' },
			{ path: './src/views', extensions: ['.html'] },
		],
	});
}

app.use(router);

app.use(notFoundMiddleware());

app.use(errorMiddleware());

export { app };
