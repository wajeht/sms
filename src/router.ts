import express from 'express';
import {
	getUpdateHandler,
	getAPIPageHandler,
	getHealthzHandler,
	getHomepageHandler,
	getPrivacyPolicyPageHandler,
	getTermsOfServicePageHandler,
	getAPICategoriesHandler,
	getAPICategoriesNameHandler,
	getAPICarriersHandler,
	getAPICarriersNameHandler,
	getAPIEmailsHandler,
} from './handler';

const router = express.Router();

router.get('/', getHomepageHandler);

router.get('/healthz', getHealthzHandler);

router.get('/update', getUpdateHandler);

router.get('/privacy-policy', getPrivacyPolicyPageHandler);

router.get('/terms-of-service', getTermsOfServicePageHandler);

router.get('/api', getAPIPageHandler);

router.get('/api/categories', getAPICategoriesHandler);

router.get('/api/categories/:name', getAPICategoriesNameHandler);

router.get('/api/carriers', getAPICarriersHandler);

router.get('/api/carriers/:id', getAPICarriersNameHandler);

router.get('/api/emails', getAPIEmailsHandler);

export { router };
