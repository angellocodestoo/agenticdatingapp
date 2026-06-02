import type {
  Persona,
  Candidate,
  ConversationTurn,
  MatchReport,
} from "@/lib/types";
import type { MockSourceData } from "@/lib/integrations/mock";

export type BuildPersonaInput = {
  sources: MockSourceData;
  artifacts: string[];
  existingPersona?: Persona;
};

export type ConverseOutput = {
  turns: ConversationTurn[];
  report: MatchReport;
};

export interface AgentEngine {
  buildPersona(input: BuildPersonaInput): Promise<Persona>;
  converse(me: Persona, candidate: Candidate): Promise<ConverseOutput>;
}
