export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} was not found.`,
    },
  });
};

// Keep database and server errors in one place so controllers stay readable.
export const errorHandler = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_ID', message: 'Invalid idea or user ID.' },
    });
  }

  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    const message = field === 'email'
      ? 'An account with this email already exists.'
      : 'This record already exists.';

    return res.status(409).json({
      success: false,
      error: { code: field === 'email' ? 'EMAIL_TAKEN' : 'DUPLICATE_RESOURCE', message },
    });
  }

  console.log(error);

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected server error occurred.',
    },
  });
};
