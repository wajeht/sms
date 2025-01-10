import ejs from 'ejs';
import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import { router } from './router.js';
import compression from 'compression';
import expressLayouts from 'express-ejs-layouts';
import { errorMiddleware, notFoundMiddleware } from './middleware.js';

const app = express();

app.use(cors());

app.use(compression());

app.use(helmet());

app.use(express.json({ limit: '100kb' }));

app.use(express.urlencoded({ extended: true, limit: '100kb' }));

app.use(express.static('./public', { maxAge: '30d', etag: true, lastModified: true }));

app.engine('html', ejs.renderFile);

app.set('view engine', 'html');

app.set('view cache', true);

app.set('views', './src/views/pages');

app.set('layout', '../layouts/public.html');

app.use(expressLayouts);

app.use(router);

app.use(notFoundMiddleware);

app.use(errorMiddleware);

export { app };
