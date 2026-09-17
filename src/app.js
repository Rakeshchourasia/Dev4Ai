import dotenv from "dotenv";
dotenv.config();

import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./modules/auth/routes/auth.routes.js";
import companyRoutes from "./modules/company/routes/company.routes.js";
import squadRoutes from "./modules/squads/routes/squad.routes.js";
import sprintRoutes from "./modules/sprints/routes/sprint.routes.js";
import ticketRoutes from "./modules/tickets/routes/ticket.routes.js";
import squadMemberRoutes from "./modules/squads/routes/squadMember.routes.js";
import activityRoutes from "./modules/activity/routes/activity.routes.js";
import dashboardRoutes from "./modules/dashboard/routes/dashboard.routes.js";
import githubConnectionRoutes from "./modules/github/routes/githubConnection.routes.js";
import errorHandler from "./shared/middlewares/errorHandler.js";

import { db } from "./db/index.js";
import { sql } from "drizzle-orm";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const swaggerDocument = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "../docs/swagger.yaml"), "utf8")
);

// ==========================================
// SECURITY
// ==========================================

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginOpenerPolicy: { policy: "unsafe-none" },
  })
);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "5mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
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
  max: process.env.NODE_ENV === 'development' ? 3000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

app.use(apiLimiter);

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ==========================================
// HEALTH ENDPOINT
// Must be before protected routes
// ==========================================

app.get("/health", async (req, res) => {
  try {
    await db.execute(sql`SELECT 1`);

    return res.status(200).json({
      success: true,
      message: "Service is healthy",
      data: {
        status: "ok",
        database: "connected",
      },
    });
  } catch (err) {
    console.error("[Health] Database check failed:", err.message);

    return res.status(503).json({
      success: false,
      message: "Service is unhealthy",
      data: {
        status: "error",
        database: "disconnected",
      },
    });
  }
});

// ==========================================
// STATIC FILES & UI
// ==========================================

app.use(express.static(path.resolve(__dirname, "../public")));

// ==========================================
// SWAGGER
// ==========================================

app.get("/api", (req, res) => {
  res.send("Welcome to Dev4AI 🚀");
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ==========================================
// ROUTES
// ==========================================

app.use("/auth", authRoutes);
app.use("/companies", companyRoutes);
app.use("/squads", squadRoutes);
app.use("/squads", squadMemberRoutes);
app.use("/squad-members", squadMemberRoutes);
app.use("/sprints", sprintRoutes);
app.use("/tickets", ticketRoutes);
app.use("/activities", activityRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/github", githubConnectionRoutes);

// ==========================================
// 404 HANDLER
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================

app.use(errorHandler);

export default app;