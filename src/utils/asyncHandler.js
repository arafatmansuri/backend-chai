const asyncHandler =  (requestHandler) => {
  return async (req, res, next) => {
    await Promise.resolve(requestHandler(req, res, next)).catch((err) => {
      return next(err);
    });
  };
};

export { asyncHandler };
