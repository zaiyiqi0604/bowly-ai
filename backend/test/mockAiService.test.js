import assert from "node:assert/strict";
import test from "node:test";
import {
  createMockCoachResponse,
  createMockParentReport,
} from "../dist/services/mockAiService.js";

const baseCoachRequest = {
  childName: "Emily",
  practiceMode: "free",
  practiceTitle: "Just play",
  pitchStability: 62,
  naturalPause: true,
  activity: {
    phraseCount: 3,
    totalPlayingSeconds: 48,
    longestContinuousSeconds: 21,
    inTunePercent: 68,
    stablePitchPercent: 72,
    pitchDataQuality: "good",
  },
  observations: [],
};

test("coach stays quiet while the child is playing", () => {
  const response = createMockCoachResponse({
    ...baseCoachRequest,
    naturalPause: false,
  });
  assert.equal(response.action, "stay_quiet");
  assert.equal(response.message, "");
});

test("camera visibility is described without posture correction", () => {
  const response = createMockCoachResponse({
    ...baseCoachRequest,
    observations: [{
      type: "arms-not-visible",
      title: "Arm visibility",
      durationSeconds: 6,
      occurrences: 2,
      confidence: 0.9,
      category: "framing",
    }],
  });
  assert.equal(response.action, "micro_feedback");
  assert.match(response.message, /camera view/i);
  assert.doesNotMatch(response.message, /wrong|posture|relax/i);
});

test("pitch feedback is withheld when the sample is insufficient", () => {
  const response = createMockCoachResponse({
    ...baseCoachRequest,
    pitchStability: 95,
    activity: {
      ...baseCoachRequest.activity,
      pitchDataQuality: "insufficient",
    },
  });
  assert.equal(response.action, "stay_quiet");
});

test("parent report uses measured activity", () => {
  const report = createMockParentReport({
    id: "session-1",
    startedAt: 0,
    endedAt: 60000,
    durationSeconds: 60,
    childName: "Emily",
    practiceMode: "free",
    metrics: {
      bowStability: 0,
      pitchStability: 72,
      rhythmStability: 0,
      postureConfidence: 0,
      confidenceLevel: 0,
    },
    challenge: {
      id: "plan-1",
      type: "free-practice",
      title: "Just play",
      description: "",
      target: 0,
      progress: 0,
      completed: false,
    },
    timeline: [],
    coachHighlights: [],
    reviewMoments: [],
    activity: {
      phraseCount: 3,
      phraseDurationsSeconds: [12, 15, 21],
      pauseCount: 2,
      totalPlayingSeconds: 48,
      longestContinuousSeconds: 21,
      pitchedSeconds: 40,
      inTuneSeconds: 27.2,
      stablePitchSeconds: 28.8,
      inTunePercent: 68,
      stablePitchPercent: 72,
      pitchDataQuality: "good",
    },
  });
  assert.match(report.summary, /3 playing sections/);
  assert.match(report.memoryInsight, /More playing sections/);
});
