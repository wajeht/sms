import express from 'express';
import {
	getAPIPageHandler,
	getHealthzHandler,
	getHomepageHandler,
	getPrivacyPolicyPageHandler,
	getTermsOfServicePageHandler,
} from './handler';

const router = express.Router();

router.get('/', getHomepageHandler);

router.get('/healthz', getHealthzHandler);

router.get('/update', getHealthzHandler);

router.get('/api', getAPIPageHandler);

router.get('/privacy-policy', getPrivacyPolicyPageHandler);

router.get('/terms-of-service', getTermsOfServicePageHandler);

export { router };
