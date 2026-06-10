import { Router } from "express";
import { z } from "zod";
import { generateCoachFeedback } from "../services/aiOrchestrator.js";

const coachRouter = Router();

const coachRequestSchema = z.object({
  childName: z.string().min(1),
  challengeTitle: z.string().min(1),
  metrics: z.object({
    pitchStability: z.number(),
    postureConfidence: z.number(),
    rhythmStability: z.number(),
    confidenceLevel: z.number(),
  }),
});

coachRouter.post("/coach", async (req, res, next) => {
  try {
    const payload = coachRequestSchema.parse(req.body);
    const response = await generateCoachFeedback(payload);
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default coachRouter;
