import jwt from "jsonwebtoken";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const verifyJWT = asyncHandler(async (req, _, next) => {
  const token =
    req.cookies.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");
    // const us = req.user;
    // const usId =  req.user._id;
  if (!token) {
    throw new ApiError(401, "Unauthorized");
  }
  try {
    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken._id).select(
      "-password -refreshToken"
    );
    
    // const user = await User.findById(usId);
    if (!user) {
      throw new ApiError(401, "anuathorized");
    }
    
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid access token");
  }
});
