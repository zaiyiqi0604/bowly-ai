import { Router } from "express";

const healthRouter = Router();

healthRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "bowly-ai-backend",
    useMockAi: (process.env.USE_MOCK_AI ?? "true").toLowerCase() !== "false",
  });
});

export default healthRouter;
