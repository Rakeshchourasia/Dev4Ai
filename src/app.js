import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import errorHandler from "./shared/middlewares/errorHandler.js";
import companyRoutes from "./modules/company/routes/company.routes.js";
import squadRoutes from "./modules/squads/routes/squad.routes.js";
import sprintRoutes from "./modules/sprints/routes/sprint.routes.js";
import ticketRoutes from "./modules/tickets/routes/ticket.routes.js";
import squadMemberRoutes from "./modules/squads/routes/squadMember.routes.js";
import activityRoutes from "./modules/activity/routes/activity.routes.js";
import dashboardRoutes from "./modules/dashboard/routes/dashboard.routes.js";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "../docs/swagger.yaml"), "utf8")
);

dotenv.config();

// ==========================================
// SECURITY
// ==========================================

app.disable("x-powered-by");

app.use(
  helmet()
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "1mb",
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },
});

app.use(apiLimiter);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);

  next();
});

app.get("/", (req, res) => {
  res.send("Welcome to Dev4AI 🚀");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use("/auth", authRoutes);
app.use("/companies", companyRoutes);
app.use("/squads", squadRoutes);
app.use("/sprints", sprintRoutes);
app.use("/tickets", ticketRoutes);
app.use("/squads", squadMemberRoutes);
app.use("/activities", activityRoutes);
app.use(
  "/dashboard",
  dashboardRoutes
);

app.use(errorHandler);

export default app;