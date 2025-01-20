import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { User } from "../models/user.models.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  deleteFromCloudinary,
  uploadOnCloudinary,
} from "../utils/cloudinary.js";
const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    //small check for user :
    if (!user) {
      return new ApiError(400, "User doesn't exist");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Somthing went wrong while generating access and refresh tokens"
    );
  }
};
const registerUser = asyncHandler(async (req, res) => {
  //TODO : Wrap up all the errors in the form of object
  const { fullname, email, username, password } = req.body;

  //validation:
  if (
    [fullname, email, username, password].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(400, { message: "All fields are required" });
  }
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, {
      message: "User with username of email already exist",
    });
    // return res
    //   .status(404)
    //   .json({ message: "User with username of email already exist" });
  }
  // console.warn(req.files);

  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverLocalPath = req.files?.coverImage?.[0]?.path;

  // if (!avatarLocalPath) {
  //   throw new ApiError(409, "Avatar file is missing");
  // }
  // const avatar = await uploadOnCloudinary(avatarLocalPath);
  //check if there is cover local path than only perform
  // let coverImage = "";
  // if (coverLocalPath) {
  //   coverImage = await uploadOnCloudinary(coverLocalPath);
  // }

  let avatar;
  try {
    avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log("Uploaded avatar", avatar.url);
  } catch (error) {
    console.log("Error uploading avatar", error);
    throw new ApiError(500, { message: "Failed to upload avatar" });
  }
  let coverImage;
  try {
    coverImage = await uploadOnCloudinary(coverLocalPath);
    // console.log("Uploaded coverImage", coverImage.url);
  } catch (error) {
    console.log("Error uploading coverImage", error);
    throw new ApiError(500, { message: "Failed to upload CoverImage" });
  }

  try {
    const user = await User.create({
      fullname,
      avatar: avatar?.url || "",
      coverImage: coverImage?.url || "",
      email,
      password,
      username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );
    if (!createdUser) {
      throw new ApiError(500, {
        message: "Something went wrong while registering a user",
      });
    }

    return res
      .status(201)
      .json(new ApiResponse(200, createdUser, "User registered Successfully"));
  } catch (error) {
    console.log("User creation failed");
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id);
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id);
    }
    throw new ApiError(500, {
      message:
        "Something went wrong while registering a user and images were deleted",
    });
  }
});

const logInUser = asyncHandler(async (req, res) => {
  //get data from body
  const { username, email, password } = req.body;
  // console.log(req);
  console.log(password);
  console.log(req.body); // To ensure you receive the correct email and password
  //validate
  if (
    [email, password, username].some((field) => {
      return field?.trim() === "";
    })
  ) {
    throw new ApiError(404, { message: "All fields are required" });
  }
  // const us = await req.body;
  // console.log(us);
  // const user = await User.findById(us._id);
  const user = await User.findOne({
    $or: [{ username }, { email }],
  }); // Should look up user by email
  console.log("Entered User", user);
  // console.log("C User", cUser);
  if (!user) {
    throw new ApiError(404, { message: "Couldn't find user" });
  }

  //validate password
  console.log("User given pass", req.body.password);
  const isPasswordValid = await user.isPasswordCorrect(password);
  console.log(isPasswordValid); // getting false tried both
  // const GivePass = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(404, { message: "Invalid Credentials" });
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  // console.warn("Our logged Error", loggedInUser);
  //Check if user if logged in or not
  if (!loggedInUser) {
    throw new ApiError(500, { message: "Something went wrong from our side" });
  }

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User Logged in sucessfully"
      )
    );
  // .json(new ApiResponse(200, loggedInUser, "User logged in successfully"));
});

const logOutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    { new: true }
  );

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV == "production",
  };

  return res
    .status(200)
    .clearCookies("accessToken", options)
    .clearCookies("refreshToken", options)
    .json(new ApiError(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiError(401, "Refresh token is required");
  }
  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }
    if (incomingRefreshToken != user?.refreshToken) {
      throw new ApiError(401, "Invalid refresh token-expired");
    }

    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    };

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user._id);
    return res
      .status(200)
      .cookies("accessToken", "accessToken", "options")
      .cookies("RefreshToken", "newRefreshToken", "options")
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(
      500,
      "something went wrong while accessing refresh token"
    );
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user?._id);

  const isPasswordValid = user.isPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Old password is invalid");
  }
  user.password = newPassword;

  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current User details"));
});
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { fullname, email } = req.body;

  if (!fullname || !email) {
    throw new ApiError(400, "Fullname and email are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullname,
        email: email,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details changed successfully"));
});
const updateUserAvatar = asyncHandler(async (req, res) => {
  const avatarLocalPath = req.file?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "File is required");
  }
  const avatar = await uploadOnCloudinary(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(500, "Something went wrong while uploading avatar");
  }
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    { new: true }
  ).select("-password -refreshToken");

  res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully"));
});
const updateUserCoverImage = asyncHandler(async (req, res) => {
  const coverLocalPath = req.file?.path;
  if (!coverLocalPath) {
    throw new ApiError(400, "File is required");
  }
  const coverImage = await uploadOnCloudinary(coverLocalPath);

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {
      new: true,
    }
  ).select("-password -refreshToken");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
});
const getUserChannleProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;
  if (!username?.trim()) {
    throw new ApiError(400, { message: "Username is required" });
  }
  const channle = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscribers",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubsriedToCount: {
          $size: "$subscribedTo",
        },
        isSubsribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    //Project only the neccessary data
    {
      $project: {
        fullname: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubsriedToCount: 1,
        isSubsribed: 1,
        email: 1,
      },
    },
  ]);
  if (!channle?.length) {
    throw new ApiError(400, { message: "Channel not found" });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, channle[0], "Channle fetched successfully"));
});
const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId.createFromHexString(req.user?._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "Owner",
              pipeline: [
                {
                  $project: {
                    fullname: 1,
                    username: 1,
                  },
                },
                {
                  $addFields: {
                    owner: {
                      $first: "$Owner",
                    },
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ]);
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0]?.watchHistory,
        "Watch history fetched successfully"
      )
    );
});

//Exports :
export {
  changeCurrentPassword,
  generateAccessAndRefreshToken,
  getCurrentUser,
  getUserChannleProfile,
  getWatchHistory,
  logInUser,
  logOutUser,
  refreshAccessToken,
  registerUser,
  updateAccountDetails,
  updateUserAvatar,
  updateUserCoverImage,
};
