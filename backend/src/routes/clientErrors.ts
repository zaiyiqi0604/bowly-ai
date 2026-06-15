import { Router } from "express";
import { z } from "zod";

const clientErrorsRouter = Router();

const clientErrorSchema = z.object({
  message: z.string().min(1).max(500),
  source: z.string().max(200).optional(),
  route: z.string().max(200).optional(),
  userAgent: z.string().max(200).optional(),
  occurredAt: z.number().int().positive(),
});

clientErrorsRouter.post("/client-errors", (req, res, next) => {
  try {
    const event = clientErrorSchema.parse(req.body);
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "client_error",
      requestId: res.locals.requestId,
      ...event,
    }));
    res.status(202).json({ accepted: true });
  } catch (error) {
    next(error);
  }
});

export default clientErrorsRouter;
