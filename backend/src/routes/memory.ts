import { Router } from "express";
import { z } from "zod";
import { generateMemorySummary } from "../services/aiOrchestrator.js";

const memoryRouter = Router();

const memoryRequestSchema = z.object({
  sessions: z.array(
    z.object({
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
    })
  ),
});

memoryRouter.post("/memory/summary", async (req, res, next) => {
  try {
    const payload = memoryRequestSchema.parse(req.body);
    const response = await generateMemorySummary(payload.sessions);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default memoryRouter;
