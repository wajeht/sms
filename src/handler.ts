import { Request, Response } from 'express'
import { carriers } from './db/carriers'

// GET /healthz
export function getHealthzHandler (req: Request, res: Response) {
   res.status(200).send('ok');
}

// GET /
export function getHomepageHandler(req: Request, res: Response) {
  return res.render('home.html', { carriers });
}

// GET /privacy-policy
export function getPrivacyPolicyPageHandler(req: Request, res: Response) {
  return res.render('privacy-policy.html', { title: 'Privacy Policy'});
}

// GET /terms-of-service
export function getTermsOfServicePageHandler(req: Request, res: Response) {
  return res.render('terms-of-service.html',  { title: 'Terms of Service'});
}

// GET /contact
export function getContactPageHandler(req: Request, res: Response) {
  return res.render('contact.html', { title: 'Contact'});
}

// GET /api-docs
export function getAPIDocsPageHandler(req: Request, res: Response) {
  return res.render('api-docs.html', { title: 'API Doc'});
}
