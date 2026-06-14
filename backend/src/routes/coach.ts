import { Router } from "express";
import { z } from "zod";
import { generateCoachFeedback } from "../services/aiOrchestrator.js";

const coachRouter = Router();

const coachRequestSchema = z.object({
  childName: z.string().min(1),
  practiceMode: z.enum(["assignment", "free"]),
  practiceTitle: z.string().min(1),
  pitchStability: z.number().min(0).max(100),
  naturalPause: z.boolean(),
  activity: z.object({
    phraseCount: z.number().int().min(0),
    totalPlayingSeconds: z.number().min(0),
    longestContinuousSeconds: z.number().min(0),
    inTunePercent: z.number().min(0).max(100),
    stablePitchPercent: z.number().min(0).max(100),
    pitchDataQuality: z.enum(["insufficient", "limited", "good"]),
  }),
  observations: z.array(z.object({
    type: z.string().min(1),
    title: z.string().min(1),
    durationSeconds: z.number().min(0),
    occurrences: z.number().int().min(1),
    confidence: z.number().min(0).max(1),
    category: z.enum(["framing", "posture"]),
  })).max(5),
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
