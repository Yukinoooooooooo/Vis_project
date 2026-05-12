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
          {data.uncertainty.missingEvidenceTypes.map((item) => (
            <span key={item}>{item}</span>
          ))}
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
                <span>{card.sourceName}</span>
              </div>
              <h3>{card.objectName}</h3>
              <p>{card.phenomenon}</p>
              <p className="boundary">{card.boundaryHint}</p>
              <a className="inline-link" href={card.sourcePreviewUrl} target="_blank" rel="noreferrer">
                打开来源 <ExternalLink size={14} />
              </a>
            </article>
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
