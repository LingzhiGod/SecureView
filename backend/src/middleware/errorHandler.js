export function errorHandler(err, req, res, next) {
  console.error(err);
  if (res.headersSent) {
    return next(err);
  }
  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'File too large (max 200MB)' });
  }
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
}
