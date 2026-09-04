import swaggerUi from "swagger-ui-express";
import YAML from "yaml";
import fs from "fs";

const swaggerFile = fs.readFileSync(
  "./src/docs/swagger.yaml",
  "utf8"
);

const swaggerDocument = YAML.parse(swaggerFile);

export const setupSwagger = (app) => {
  app.use(
    "/swagger",
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument)
  );
};