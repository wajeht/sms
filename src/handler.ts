import {Request, Response} from 'express'

export function getHealthzHandler (req: Request, res: Response) {
   res.status(200).send('ok');
   return;
}

export function getHomepageHandler(req: Request, res: Response) {
  return res.render('home.html');
}
