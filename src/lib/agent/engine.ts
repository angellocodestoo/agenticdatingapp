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
  basics?: {
    age: number;
    gender: Persona["gender"];
    seeking: Persona["seeking"];
    wantsKids: Persona["wantsKids"];
  };
};

export type ConverseOutput = {
  turns: ConversationTurn[];
  report: MatchReport;
};

export type ConverseOptions = {
  /** The user's date-qualification threshold; report copy references it. */
  threshold?: number;
};

export interface AgentEngine {
  buildPersona(input: BuildPersonaInput): Promise<Persona>;
  converse(me: Persona, candidate: Candidate, opts?: ConverseOptions): Promise<ConverseOutput>;
}
