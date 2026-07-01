import { Router } from "express";
import { z } from "zod";
import { generateParentReport } from "../services/aiOrchestrator.js";
import { withDurationLine } from "../services/reportService.js";

const reportRouter = Router();

const poseSnapshotSchema = z.object({
  capturedAt: z.number(),
  points: z.array(
    z.object({
      id: z.number(),
      x: z.number(),
      y: z.number(),
      confidence: z.number(),
    })
  ),
  bow: z.object({
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    confidence: z.number(),
  }).optional(),
  violin: z.object({
    startX: z.number(),
    startY: z.number(),
    endX: z.number(),
    endY: z.number(),
    confidence: z.number(),
  }).optional(),
});

const reportRequestSchema = z.object({
  id: z.string(),
  startedAt: z.number(),
  endedAt: z.number(),
  durationSeconds: z.number(),
  childName: z.string(),
  practiceMode: z.enum(["assignment", "free"]).optional(),
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
  reviewMoments: z.array(
    z.object({
      id: z.string(),
      key: z.string(),
      title: z.string(),
      suggestion: z.string(),
      firstSeenAt: z.number(),
      lastSeenAt: z.number(),
      occurrences: z.number(),
      totalDurationSeconds: z.number(),
      confidence: z.number().min(0).max(1).optional(),
      category: z.enum(["framing", "posture"]).optional(),
      before: poseSnapshotSchema,
      after: poseSnapshotSchema.optional(),
    })
  ).optional(),
  activity: z.object({
    phraseCount: z.number().int().min(0),
    phraseDurationsSeconds: z.array(z.number().min(0)),
    pauseCount: z.number().int().min(0),
    totalPlayingSeconds: z.number().min(0),
    longestContinuousSeconds: z.number().min(0),
    pitchedSeconds: z.number().min(0),
    inTuneSeconds: z.number().min(0),
    stablePitchSeconds: z.number().min(0),
    inTunePercent: z.number().min(0).max(100),
    stablePitchPercent: z.number().min(0).max(100),
    pitchDataQuality: z.enum(["insufficient", "limited", "good"]),
    pitchMoments: z.array(z.object({
      id: z.string(),
      firstSeenAt: z.number(),
      lastSeenAt: z.number(),
      startOffsetSeconds: z.number().min(0),
      endOffsetSeconds: z.number().min(0),
      totalDurationSeconds: z.number().min(0),
      averageAbsCents: z.number().min(0),
      peakAbsCents: z.number().min(0),
      noteName: z.string().optional(),
      direction: z.enum(["sharp", "flat", "mixed"]),
    })).optional(),
  }).optional(),
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
