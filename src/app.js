import express from "express";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import companyRoutes from "./modules/company/routes/company.routes.js";

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
app.use("/companies", companyRoutes);


export default app;