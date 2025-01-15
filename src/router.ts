import express from 'express';
import {
	getContactPageHandler,
	getHealthzHandler,
	getHomepageHandler,
	getPrivacyPolicyPageHandler,
	getTermsOfServicePageHandler,
} from './handler';

const router = express.Router();

router.get('/', getHomepageHandler);

router.get('/healthz', getHealthzHandler);

router.get('/contact', getContactPageHandler);

router.get('/privacy-policy', getPrivacyPolicyPageHandler);

router.get('/terms-of-service', getTermsOfServicePageHandler);

export { router };
