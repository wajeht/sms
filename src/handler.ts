import { Request, Response } from 'express'

// GET /healthz
export function getHealthzHandler (req: Request, res: Response) {
   res.status(200).send('ok');
}

// GET /
export function getHomepageHandler(req: Request, res: Response) {
  return res.render('home.html');
}

// GET /privacy-policy
export function getPrivacyPolicyPageHandler(req: Request, res: Response) {
  return res.render('privacy-policy.html', { title: 'Privacy Policy'});
}

// GET /terms-of-service
export function getTermsOfServicePageHandler(req: Request, res: Response) {
  return res.render('terms-of-service.html',  { title: 'Terms of Service'});
}
