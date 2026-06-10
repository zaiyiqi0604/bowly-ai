import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import coachRouter from "./routes/coach.js";
import healthRouter from "./routes/health.js";
import memoryRouter from "./routes/memory.js";
import reportRouter from "./routes/report.js";

dotenv.config();

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "1mb" }));

  app.use(healthRouter);
  app.use(coachRouter);
  app.use(reportRouter);
  app.use(memoryRouter);

  app.use(
    (
      error: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      console.error(error);
      res.status(400).json({
        error: "Request failed",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
    }
  );

  return app;
}
