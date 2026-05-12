import type { EvidenceLevel, JudgmentLevel, SeverityLevel } from "@risk-map/shared";

export function SeverityBadge({ level }: { level: SeverityLevel }) {
  return <span className={`level-badge severity-${level}`}>{level}</span>;
}

export function JudgmentBadge({ level }: { level: JudgmentLevel }) {
  return <span className="level-badge judgment">{level}</span>;
}

export function EvidenceBadge({ level }: { level: EvidenceLevel }) {
  return <span className="level-badge evidence">{level}</span>;
}

