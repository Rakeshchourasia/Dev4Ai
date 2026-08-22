import express from "express";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import authRoutes from "./modules/auth/routes/auth.routes.js";
import { errorHandler } from "./shared/middlewares/errorHandler.js";
import companyRoutes from "./modules/company/routes/company.routes.js";
import squadRoutes from "./modules/squads/routes/squad.routes.js";
import sprintRoutes from "./modules/sprints/routes/sprint.routes.js";
import ticketRoutes from "./modules/tickets/routes/ticket.routes.js";
import squadMemberRoutes from "./modules/squads/routes/squadMember.routes.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerDocument = YAML.parse(
  fs.readFileSync(path.resolve(__dirname, "../docs/swagger.yaml"), "utf8")
);

dotenv.config();
app.use(express.json());

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

app.use(errorHandler);

export default app;