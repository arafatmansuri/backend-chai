import bcrypt from "bcrypt";
import jsonwebtoken from "jsonwebtoken";
import mongoose, { Schema } from "mongoose";
import { ApiError } from "../utils/ApiError.js";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullname: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatar: {
      type: String, //url
      // required: true,
    },
    coverImage: {
      type: String, //url
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "video", //schema to be reffered
      },
    ],
    password: {
      type: String,
      required: [true, "password is required"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 10);

  return next();
});

userSchema.methods.isPasswordCorrect = async function (Enpassword) {
  console.log("Actual password", this.password);
  console.log("user given password", Enpassword);
  return bcrypt.compareSync(Enpassword, this.password);
};

userSchema.methods.generateAccessToken = function () {
  // short lived Access tokens
  return jsonwebtoken.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullname: this.fullname,
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};
userSchema.methods.generateRefreshToken = function () {
  // short lived Access tokens
  return jsonwebtoken.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};
export const User = mongoose.model("User", userSchema);
