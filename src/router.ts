import express from 'express';
import {
	getUpdateHandler,
	getAPIPageHandler,
	getHealthzHandler,
	getHomepageHandler,
	getPrivacyPolicyPageHandler,
	getTermsOfServicePageHandler,
	getAPICategoriesHandler,
	getAPICarriersHandler,
	getAPIEmailsHandler,
	getAPICategoryNameHandler,
	getAPICarrierIDHandler,
	getPhonePageHandler,
	getDownloadAsCSVPageHandler,
} from './handler';

const router = express.Router();

router.get('/', getHomepageHandler);

router.get('/healthz', getHealthzHandler);

router.get('/update', getUpdateHandler);

router.get('/privacy-policy', getPrivacyPolicyPageHandler);

router.get('/terms-of-service', getTermsOfServicePageHandler);

router.get('/download-csv', getDownloadAsCSVPageHandler);

router.get('/phone', getPhonePageHandler);

router.get('/api', getAPIPageHandler);

router.get('/api/categories', getAPICategoriesHandler);

router.get('/api/categories/:name', getAPICategoryNameHandler);

router.get('/api/carriers', getAPICarriersHandler);

router.get('/api/carriers/:id', getAPICarrierIDHandler);

router.get('/api/emails', getAPIEmailsHandler);

export { router };
