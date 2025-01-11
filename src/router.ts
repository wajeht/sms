import express from 'express';
import { getAPIDocsPageHandler, getContactPageHandler, getHealthzHandler, getHomepageHandler, getPrivacyPolicyPageHandler, getTermsOfServicePageHandler } from './handler'

const router = express.Router();

router.get('/', getHomepageHandler)

router.get('/healthz', getHealthzHandler)

router.get('/contact', getContactPageHandler)

router.get('/api-docs', getAPIDocsPageHandler)

router.get('/privacy-policy', getPrivacyPolicyPageHandler)

router.get('/terms-of-service', getTermsOfServicePageHandler)

export { router };
