import express from 'express';
import { getHealthzHandler, getHomepageHandler } from './handler'

const router = express.Router();

router.get('/', getHomepageHandler)

router.get('/healthz', getHealthzHandler)

export { router };
