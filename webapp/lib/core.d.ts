// Type declarations for core.js, which is deliberately plain JavaScript so the same
// file runs in the CLI, the static build and this Next app. Hand-maintained: if you
// change core.js's exports, update this too.

export type Status = 'direct' | 'caveat' | 'preview' | 'redesign' | 'none' | 'unknown';

export interface Finding {
  module: string;
  key?: string;
  forge: string | null;
  status: Status;
  note?: string;
  effortDays: number;
  dataMigration?: boolean;
  product?: string;
}

export interface GlobalRisk {
  id: string;
  severity: 'high' | 'medium' | 'low';
  title: string;
  detail: string;
}

export interface Report {
  app: {
    key?: string;
    name?: string;
    baseUrl?: string;
    hasLifecycle: boolean;
    scopes: string[];
    products: string[];
  };
  findings: Finding[];
  globalRisks: GlobalRisk[];
  summary: Partial<Record<Status, number>>;
  blockers: Finding[];
  effort: {
    moduleDays: number;
    baseOverheadDays: number;
    totalDays: number;
    totalWeeks: number;
  };
  meta: {
    retrieved: string;
    connectEndOfSupport: string;
    connectUpdatesFrozenSince: string;
    source: string;
  };
}

export interface Verdict {
  score: number;
  verdict: 'Straightforward' | 'Moderate' | 'Difficult' | 'High risk';
  note: string;
}

export function analyze(map: unknown, descriptor: unknown): Report;
export function readiness(report: Report): Verdict;
export function toMarkdown(report: Report): string;
export function toTerminal(report: Report): string;

export const ICON: Record<Status, string>;
export const LABEL: Record<Status, string>;
export const ORDER: Status[];
