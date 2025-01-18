import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js";

const errorHandler = (err, req, res, next) => {
  let error = err;

  // If the error is not an instance of ApiError, handle it
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || "Something went wrong";

    // Re-create the error as an instance of ApiError
    error = new ApiError(
      statusCode,
      { message },
      error.errors || [],
      err.stack
    );
  }

  // Prepare the response object
  const response = {
    success: false, // Ensure we return success = false in errors
    message: error.message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === "development" ? { stack: error.stack } : {}), // Add stack trace only in development mode
  };

  // Send the error response
  return res.status(error.statusCode).json(response);
};

export { errorHandler };
