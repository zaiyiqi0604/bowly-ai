export type MotivationLevel = "low" | "medium" | "high";

/** Map Qwen/free-text motivation labels to the strict API enum. */
export function normalizeMotivationLevel(value: unknown): MotivationLevel {
  if (typeof value !== "string") {
    return "medium";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high") {
    return normalized;
  }

  if (
    /^(low|weak|quiet|tired|discouraged|struggling|unmotivated|hesitant)$/.test(
      normalized
    ) ||
    /\b(low|weak|quiet|tired|discouraged|struggling)\b/.test(normalized)
  ) {
    return "low";
  }

  if (
    /^(high|strong|energetic|confident|motivated|engaged|excited)$/.test(
      normalized
    ) ||
    /\b(high|strong|energetic|confident|motivated|engaged)\b/.test(normalized)
  ) {
    return "high";
  }

  if (
    /^(medium|moderate|steady|okay|fair|average|building|mixed)$/.test(
      normalized
    ) ||
    /\b(medium|moderate|steady|building)\b/.test(normalized)
  ) {
    return "medium";
  }

  return "medium";
}
