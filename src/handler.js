export function getHealthzHandler (req, res) {
  return res.status(200).send('ok');
}

export function getHomepageHandler(req, res) {
  return res.render('home.html');
}
