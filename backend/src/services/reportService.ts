import type { ParentReportResponse } from "../types/ai.js";
import type { PracticeSessionRecord } from "../types/session.js";

export function withDurationLine(
  session: PracticeSessionRecord,
  report: ParentReportResponse
): ParentReportResponse {
  const minutes = Math.max(1, Math.round(session.durationSeconds / 60));
  return {
    ...report,
    summary: `${session.childName} practiced for ${minutes} minutes today.\n\n${report.summary}`,
  };
}
