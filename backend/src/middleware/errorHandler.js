function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(error);
  if (error.name === 'ValidationError') {
    return res.status(400).json({ message: error.message });
  }
  if (error.code === 11000) {
    return res.status(409).json({ message: 'That record already exists.' });
  }
  const status = error.statusCode || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong.'
    : (error.message || 'Something went wrong.');
  res.status(status).json({ message });
}

module.exports = { notFound, errorHandler };
