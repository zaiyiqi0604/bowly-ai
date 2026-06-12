import type { ParentReportResponse } from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";

export function withDurationLine(
  session: PracticeSessionRecord,
  report: ParentReportResponse
): ParentReportResponse {
  const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
  const minuteLabel = minutes === 1 ? "minute" : "minutes";
  const durationLine =
    `${session.childName} practiced for ${minutes} ${minuteLabel} today.`;
  const escapedName = session.childName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const existingDurationLine = new RegExp(
    `^${escapedName} practiced for \\d+ minutes? today\\.\\s*`,
    "i"
  );
  const summary = report.summary.trim().replace(existingDurationLine, "");

  return {
    ...report,
    summary: summary ? `${durationLine}\n\n${summary}` : durationLine,
  };
}
