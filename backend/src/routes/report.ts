import { Router } from "express";
import { z } from "zod";
import { generateParentReport } from "../services/aiOrchestrator.js";
import { withDurationLine } from "../services/reportService.js";

const reportRouter = Router();

const reportRequestSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number(),
  durationSeconds: z.number(),
  childName: z.string(),
  metrics: z.object({
    bowStability: z.number(),
    pitchStability: z.number(),
    rhythmStability: z.number(),
    postureConfidence: z.number(),
    confidenceLevel: z.number(),
  }),
  challenge: z.object({
    id: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    target: z.number(),
    progress: z.number(),
    completed: z.boolean(),
  }),
  timeline: z.array(
    z.object({
      id: z.string(),
      timestamp: z.number(),
      type: z.enum(["coach", "posture", "audio", "challenge"]),
      message: z.string(),
    })
  ),
  coachHighlights: z.array(z.string()),
});

reportRouter.post("/report", async (req, res, next) => {
  try {
    const payload = reportRequestSchema.parse(req.body);
    const response = await generateParentReport(payload);
    res.json(withDurationLine(payload, response));
  } catch (error) {
    next(error);
  }
});

export default reportRouter;
