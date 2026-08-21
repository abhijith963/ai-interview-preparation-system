export const notFound = (request, response) => {
  response.status(404).json({
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `No route exists for ${request.method} ${request.originalUrl}.`,
    },
  });
};
