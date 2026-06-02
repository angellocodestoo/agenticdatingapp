/**
 * LLM adapter stub. Drop in a real OpenAI or Anthropic key to activate.
 * When OPENAI_API_KEY or ANTHROPIC_API_KEY is set, swap scriptedEngine for this module.
 */
import type { AgentEngine } from "./engine";

export const llmEngine: AgentEngine = {
  async buildPersona() {
    throw new Error(
      "LLM engine not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY and implement this adapter."
    );
  },
  async converse() {
    throw new Error(
      "LLM engine not configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY and implement this adapter."
    );
  },
};

export function getEngine(): AgentEngine {
  const { scriptedEngine } = require("./scriptedEngine");
  return scriptedEngine;
}
