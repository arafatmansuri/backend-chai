import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
// import routes
import { errorHandler } from "./middlewares/error.middlewares.js";
import healthcheckrouter from "./routes/healthcheck.routes.js";
import userRouter from "./routes/user.routes.js";
const app = express();

app.use(cors());
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN,
//     credentials: true,
//   })
// );

// common middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// const upload = multer();
// app.use(upload.none());

app.use(express.static("public"));
app.use(cookieParser());

// routes
app.use("/api/v1/healthcheck", healthcheckrouter);
app.use("/api/v1/users", userRouter);
// app.post("/api/v1/users/login",upload.none(), logInUser);
// app.post("/api/v1/users/login", (req, res) => {
//   console.log("Headers:", req.headers);
//   console.log("Body:", req.body); // This should contain your data
//   res.send("Check the console for logs");
// });
// app.post("/api/v1/users/login", (req, res) => {
//   console.log(req.body); // This should log the email and password
// });

app.use(errorHandler);
export { app };
