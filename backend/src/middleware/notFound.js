const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    ...(req.requestId && {
      requestId: req.requestId,
    }),
  });
};

export default notFound;
