import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { useParams, useSearchParams } from "react-router-dom";
import type { WatchTargetType } from "@risk-map/shared";
import { FactBadge } from "../components/FactBadge";
import { EvidenceBadge, JudgmentBadge } from "../components/LevelBadge";
import { ErrorState } from "../components/ErrorState";
import { LoadingState } from "../components/LoadingState";
import { NoticePanel } from "../components/NoticePanel";
import { SourceTraceList } from "../components/SourceTraceList";
import { getEvidenceAssessmentView } from "../services/api";
import { useWorkspaceContextSync } from "../hooks/useWorkspaceContextSync";

export function EvidencePage() {
  const { eventId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const targetType = parseTargetType(searchParams.get("targetType"));
  const targetId = searchParams.get("targetId") ?? eventId;
  const query = useQuery({
    queryKey: ["evidenceAssessment", eventId, targetType, targetId],
    queryFn: () => getEvidenceAssessmentView(eventId, targetType, targetId),
    enabled: Boolean(eventId && targetId)
  });
  const data = query.data;
  useWorkspaceContextSync(
    data?.context ?? {
      eventId,
      eventName: null,
      windowId: "pending",
      windowLabel: "等待公开数据快照",
      updatedAt: new Date().toISOString(),
      viewMode: "evidence"
    }
  );

  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <ErrorState message={query.error.message} />;
  if (!data) return null;

  return (
    <div className="page evidence-layout">
      <div className="page-header full-span">
        <div>
          <p className="eyebrow">证据与判断</p>
          <h1>{data.assessment.targetName}</h1>
          <p className="lead">{data.assessment.judgmentText}</p>
        </div>
        <div className="badge-row">
          <JudgmentBadge level={data.assessment.judgmentLevel} />
          <EvidenceBadge level={data.assessment.evidenceLevel} />
        </div>
        <div style={{ fontSize: 13, color: "var(--studio-muted)", marginTop: 4 }}>
          上次复核：{new Date(data.assessment.lastReviewedAt).toLocaleString()}
        </div>
      </div>
      <NoticePanel notices={data.partialDataNotice} />

      <section className="panel">
        <div className="section-title">
          <h2>判断摘要</h2>
          <span>{data.assessment.evidenceCount} 张证据卡</span>
        </div>
        <p className="boundary">{data.assessment.boundaryHint}</p>
        <div className="uncertainty">
          <strong>边界</strong>
          <p>{data.uncertainty.nextSuggestedAction}</p>
          {data.uncertainty.missingEvidenceTypes.length > 0 ? (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--studio-muted)", display: "block", marginBottom: 4 }}>缺失证据类型：</span>
              <div className="tag-row">
                {data.uncertainty.missingEvidenceTypes.map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            </div>
          ) : null}
          {data.uncertainty.conflictNote ? (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: 12, color: "var(--studio-muted)", display: "block", marginBottom: 4 }}>冲突说明：</span>
              <p style={{ color: "var(--studio-text)", margin: 0 }}>{data.uncertainty.conflictNote}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel evidence-list-panel">
        <div className="section-title">
          <h2>证据卡</h2>
          <span>全部可回源</span>
        </div>
        <div className="evidence-list">
          {data.evidenceCards.map((card) => (
            <article key={card.evidenceId} className="evidence-card">
              <div className="card-topline">
                <FactBadge factType={card.factType} />
                <EvidenceBadge level={card.evidenceLevel} />
                <span className="status-pill">{card.objectType}</span>
                <span>{card.sourceName}</span>
              </div>
              <h3>{card.objectName}</h3>
              <p>{card.phenomenon}</p>
              {card.quoteFields.length > 0 ? (
                <div className="tag-row">
                  {card.quoteFields.map((qf) => (
                    <span key={qf}>{qf}</span>
                  ))}
                </div>
              ) : null}
              <p className="boundary">{card.boundaryHint}</p>
              <div className="card-footer" style={{ justifyContent: "space-between" }}>
                <span style={{ fontSize: 12, color: "var(--studio-muted)" }}>
                  捕获于 {new Date(card.capturedAt).toLocaleDateString()}
                </span>
                <a className="inline-link" href={card.sourcePreviewUrl} target="_blank" rel="noreferrer">
                  打开来源 <ExternalLink size={14} />
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      {data.comparison.compareTargetId ? (
        <section className="panel full-span">
          <div className="section-title">
            <h2>对比分析</h2>
          </div>
          <p className="boundary">{data.comparison.differenceSummary}</p>
          <div className="badge-row" style={{ marginTop: 8 }}>
            <span className="status-pill">共用证据：{data.comparison.sharedEvidenceIds.length}</span>
            <span className="status-pill">独占证据：{data.comparison.exclusiveEvidenceIds.length}</span>
          </div>
        </section>
      ) : null}

      <section className="panel full-span">
        <div className="section-title">
          <h2>推导策略</h2>
        </div>
        <div className="policy-list">
          <div className="policy-item">
            <p>{data.derivationPolicy.summary}</p>
          </div>
          {data.derivationPolicy.rules.map((rule) => (
            <div key={rule.ruleId} className="policy-item">
              <FactBadge factType={rule.factType} />
              <strong>{rule.label}</strong>
              <p>{rule.description}</p>
            </div>
          ))}
        </div>
      </section>

      <SourceTraceList traces={data.sourceTrace} />
    </div>
  );
}

function parseTargetType(value: string | null): WatchTargetType {
  if (value === "node" || value === "company" || value === "event") return value;
  return "event";
}
