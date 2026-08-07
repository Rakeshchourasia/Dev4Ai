import express from "express";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";


const app = express();
dotenv.config();
app.use(express.json());
app.use(errorHandler);
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);

  next();
});



app.get("/", (req, res) => {
  res.send("Welcome to Dev4AI 🚀");
});

app.use("/auth", authRoutes);


export default app;