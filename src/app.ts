import ejs from 'ejs';
import cors from 'cors';
import express from 'express';
import { reload } from './util';
import flash from 'connect-flash';
import { router } from './router';
import compression from 'compression';
import { appConfig } from './config';
import expressLayouts from 'express-ejs-layouts';
import {
	errorMiddleware,
	notFoundMiddleware,
	appLocalStateMiddleware,
	sessionMiddleware,
	helmetMiddleware,
} from './middleware';

const app = express();

app.set('trust proxy', 1);

app.use(sessionMiddleware());

app.use(flash());

app.use(compression());

app.use(cors());

app.use(helmetMiddleware());

app.use(express.json({ limit: '100kb' }));

app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(express.static('./public', { maxAge: '30d', etag: true, lastModified: true }));

app.engine('html', ejs.renderFile);

app.set('view engine', 'html');

app.set('view cache', appConfig.env === 'production');

app.set('views', './src/views/pages');

app.set('layout', '../layouts/public.html');

app.use(expressLayouts);

app.use(appLocalStateMiddleware);

reload({
	app,
	watch: [
		{ path: './src/views', extensions: ['.html'] },
		{ path: './public', extensions: ['.js'] },
	],
});

app.use(router);

app.use(notFoundMiddleware());

app.use(errorMiddleware());

export { app };
