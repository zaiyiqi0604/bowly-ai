import type {
  AnonymousPoseSnapshot,
  PracticeSessionRecord,
} from "../types/session";

function createSnapshot(
  capturedAt: number,
  variant: "before" | "after" = "before"
): AnonymousPoseSnapshot {
  const improved = variant === "after";
  return {
    capturedAt,
    points: [
      { id: 5, x: 0.42, y: 0.34, confidence: 0.95 },
      { id: 6, x: 0.58, y: 0.34, confidence: 0.94 },
      { id: 7, x: improved ? 0.39 : 0.38, y: improved ? 0.49 : 0.48, confidence: 0.9 },
      { id: 8, x: improved ? 0.61 : 0.63, y: improved ? 0.49 : 0.48, confidence: 0.89 },
      { id: 9, x: improved ? 0.34 : 0.31, y: improved ? 0.59 : 0.62, confidence: 0.88 },
      { id: 10, x: improved ? 0.65 : 0.69, y: improved ? 0.56 : 0.62, confidence: 0.87 },
    ],
    violin: {
      startX: 0.38,
      startY: 0.38,
      endX: 0.62,
      endY: 0.4,
      confidence: 0.75,
    },
    bow: {
      startX: improved ? 0.31 : 0.28,
      startY: improved ? 0.58 : 0.62,
      endX: improved ? 0.7 : 0.72,
      endY: improved ? 0.43 : 0.42,
      confidence: improved ? 0.84 : 0.8,
    },
    evidence: {
      label: improved ? "later local pose sample" : "edge evidence sample",
      quality: "usable",
      approximateAngleDegrees: improved ? 12 : 24,
      referenceAngleDegrees: 10,
      note: improved ? "closer to target" : "wrist stayed high",
    },
  };
}

export function createDemoSessions(now = Date.now()): PracticeSessionRecord[] {
  const day = 24 * 60 * 60 * 1000;
  const sessionTemplates = [
    { daysAgo: 5, duration: 95, phrases: [8, 10, 11], pitch: 58 },
    { daysAgo: 3, duration: 130, phrases: [10, 14, 15], pitch: 66 },
    { daysAgo: 1, duration: 165, phrases: [12, 16, 18], pitch: 74 },
    { daysAgo: 0, duration: 190, phrases: [13, 18, 22], pitch: 82 },
  ];

  return sessionTemplates.map((template, index) => {
    const endedAt = now - template.daysAgo * day;
    const startedAt = endedAt - template.duration * 1000;
    const isLatest = index === sessionTemplates.length - 1;
    const totalPlayingSeconds = template.phrases.reduce(
      (sum, value) => sum + value,
      0
    );
    const before = createSnapshot(endedAt - 45000, "before");
    const after = createSnapshot(endedAt - 9000, "after");

    return {
      id: `bowly-demo-${index + 1}`,
      startedAt,
      endedAt,
      durationSeconds: template.duration,
      childName: "Lena",
      practiceMode: "assignment",
      metrics: {
        bowStability: Math.min(88, template.pitch + 4),
        pitchStability: template.pitch,
        rhythmStability: Math.min(82, template.pitch - 2),
        postureConfidence: Math.min(86, template.pitch + 2),
        confidenceLevel: Math.min(84, template.pitch + 1),
      },
      challenge: {
        id: "open-strings",
        type: "teacher-assignment",
        title: "Open strings with a soft wrist",
        description: "Slow bow strokes while keeping the shoulder relaxed.",
        target: 3,
        progress: isLatest ? 3 : Math.min(2, index + 1),
        completed: isLatest,
      },
      timeline: [
        {
          id: `bowly-demo-${index + 1}-timeline-1`,
          timestamp: startedAt + 20000,
          type: "coach",
          message: "Bowly stayed quiet while the phrase continued.",
        },
        {
          id: `bowly-demo-${index + 1}-timeline-2`,
          timestamp: endedAt - 20000,
          type: "audio",
          message: "A natural pause created one calm coaching moment.",
        },
      ],
      coachHighlights: [
        isLatest
          ? "Lena completed three short phrases and kept the bow moving more steadily."
          : "Lena completed a short practice and built one useful routine.",
      ],
      activity: {
        phraseCount: template.phrases.length,
        phraseDurationsSeconds: template.phrases,
        pauseCount: 2,
        totalPlayingSeconds,
        longestContinuousSeconds: Math.max(...template.phrases),
        pitchedSeconds: Math.max(12, totalPlayingSeconds - 8),
        inTuneSeconds: Math.round((totalPlayingSeconds * template.pitch) / 100),
        stablePitchSeconds: Math.round((totalPlayingSeconds * template.pitch) / 100),
        inTunePercent: Math.max(52, template.pitch - 6),
        stablePitchPercent: template.pitch,
        pitchDataQuality: "good",
      },
      reviewMoments: isLatest
        ? [
            {
              id: "bowly-demo-review-1",
              key: "soft-wrist",
              title: "Bow wrist pattern",
              suggestion: "Try the next phrase with a softer bow wrist.",
              firstSeenAt: endedAt - 60000,
              lastSeenAt: endedAt - 8000,
              occurrences: 2,
              totalDurationSeconds: 11,
              confidence: 0.9,
              category: "posture",
              before,
              after,
            },
          ]
        : [],
    };
  });
}
