import type { Candidate, UserProfileState } from "@/lib/types";
import { seededCandidates } from "@/data/candidates";

export type AppState = {
  me: UserProfileState;
  candidates: Candidate[];
};

function createInitialState(): AppState {
  return {
    me: {
      userId: "u_me",
      connectedSources: [],
      artifacts: [],
      persona: undefined,
      lastProfiledAt: undefined,
    },
    candidates: seededCandidates,
  };
}

declare global {
  // eslint-disable-next-line no-var
  var __agenticDatingState: AppState | undefined;
}

export function getState(): AppState {
  if (!globalThis.__agenticDatingState) {
    globalThis.__agenticDatingState = createInitialState();
  }
  return globalThis.__agenticDatingState;
}

export function resetState(): AppState {
  globalThis.__agenticDatingState = createInitialState();
  return globalThis.__agenticDatingState;
}

export function updateMe(patch: Partial<UserProfileState>): UserProfileState {
  const state = getState();
  state.me = { ...state.me, ...patch };
  return state.me;
}

