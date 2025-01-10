export function notFoundMiddleware(req, res, next) {
  return res.status(404).json({
    msg: 'not found'
  })
}

export function errorMiddleware(err, req, res, next) {
  return res.status(500).json({
    msg: 'error'
  })
}
