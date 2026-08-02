import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "node:path";
import { existsSync } from "node:fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

app.use("/api", router);

const runtimeRoot = path.basename(process.cwd()) === "api-server"
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const webDir = path.resolve(
  process.env["WEB_STATIC_DIR"] ??
    path.join(runtimeRoot, "artifacts/kimdasa-web/dist/public"),
);
const dashboardDir = path.resolve(
  process.env["DASHBOARD_STATIC_DIR"] ??
    path.join(runtimeRoot, "artifacts/kimdasa-dashboard/dist/public"),
);

if (existsSync(webDir) && existsSync(dashboardDir)) {
  app.use("/dashboard", express.static(dashboardDir));
  app.get(/^\/dashboard(?:\/.*)?$/, (_req, res) => {
    res.sendFile(path.join(dashboardDir, "index.html"));
  });

  app.use(express.static(webDir));
  app.get(/^(?!\/api(?:\/|$)|\/dashboard(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });
} else if (process.env["NODE_ENV"] === "production") {
  logger.warn({ webDir, dashboardDir }, "Static web builds were not found");
}

export default app;
