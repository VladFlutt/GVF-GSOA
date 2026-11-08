import type { Locale } from "@/i18n/config";

/** Text in every supported language. Missing languages fall back to English, then Russian. */
export type L10n = Partial<Record<Locale, string>> & { en: string };

export type SimulatorId = "acu-panel";

export interface TheoryStep {
  kind: "theory";
  id: string;
  title: L10n;
  /** Paragraphs. A paragraph starting with "- " lines is rendered as a list. */
  body: L10n[];
  /** Illustrations under the text. Files live in public/courses/<courseId>/. */
  figures?: Figure[];
  /** @deprecated use figures */
  figure?: Figure;
}

export interface Figure {
  src: string;
  caption: L10n;
}

export interface SimStep {
  kind: "sim";
  id: string;
  title: L10n;
  intro: L10n;
  simulator: SimulatorId;
  /** Scenario name understood by the simulator (initial state + goal). */
  scenario: string;
  task: L10n;
}

export interface QuizStep {
  kind: "quiz";
  id: string;
  title: L10n;
  /** Question ids from the course question bank. */
  questions: string[];
  /** How many random questions one attempt shows. */
  perAttempt: number;
  passMark: number;
  attempts: number;
}

export type Step = TheoryStep | SimStep | QuizStep;

export interface Module {
  id: string;
  title: L10n;
  objectives: L10n[];
  steps: Step[];
}

export interface Course {
  id: string;
  code: string;
  title: L10n;
  summary: L10n;
  prerequisites: L10n[];
  modules: Module[];
}

export interface Question {
  id: string;
  type: "single" | "multi";
  prompt: L10n;
  options: { id: string; text: L10n }[];
  correct: string[];
  explanation: L10n;
}
