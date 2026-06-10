import { defineStore } from "pinia";
import type { PracticeSessionRecord } from "../types/session";

const STORAGE_KEY = "bowly-memory-sessions";

function loadSessions(): PracticeSessionRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as PracticeSessionRecord[];
  } catch {
    return [];
  }
}

export const useMemoryStore = defineStore("memory", {
  state: () => ({
    sessions: loadSessions(),
  }),
  getters: {
    latestSession: (state) => state.sessions.at(-1) ?? null,
    consistencyTrend: (state) => {
      if (state.sessions.length < 2) return "Building a new routine";
      const recent = state.sessions.slice(-3);
      const avg = recent.reduce((sum, current) => sum + current.durationSeconds, 0) / recent.length;
      if (avg >= 600) return "Strong consistency this week";
      if (avg >= 360) return "Steady progress with daily effort";
      return "Keep sessions short and regular";
    },
  },
  actions: {
    saveSession(session: PracticeSessionRecord) {
      this.sessions.push(session);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.sessions));
    },
  },
});
