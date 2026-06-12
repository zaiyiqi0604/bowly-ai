import { Router } from "express";
import { z } from "zod";
import { generateMemorySummary } from "../services/aiOrchestrator.js";

const memoryRouter = Router();

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
          before: poseSnapshotSchema,
          after: poseSnapshotSchema.optional(),
        })
      ).optional(),
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
