import { Router } from "express";
import { getAiRuntimeStatus } from "../services/aiOrchestrator.js";

const healthRouter = Router();

function createHealthResponse() {
  return {
    ok: true,
    service: "bowly-ai-backend",
    version: process.env.APP_VERSION ?? "development",
    deployment: {
      platform: process.env.DEPLOYMENT_PLATFORM ?? "local",
      region: process.env.ALIBABA_CLOUD_REGION ?? "local",
    },
    ai: getAiRuntimeStatus(),
  };
}

healthRouter.get("/health", (_req, res) => {
  res.json(createHealthResponse());
});

healthRouter.get("/", (_req, res) => {
  res.json({
    ...createHealthResponse(),
    message: "Bowly AI backend is running.",
    endpoints: ["/health", "/coach", "/report", "/memory/summary", "/client-errors"],
  });
});

// Function Compute's console test sends POST /invoke by default.
healthRouter.post("/invoke", (_req, res) => {
  res.json(createHealthResponse());
});

export default healthRouter;
