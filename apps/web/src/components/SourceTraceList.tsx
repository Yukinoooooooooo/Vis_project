import type { SourceTrace } from "@risk-map/shared";
import { ExternalLink } from "lucide-react";

export function SourceTraceList({ traces }: { traces: SourceTrace[] }) {
  if (!traces.length) return null;
  return (
    <section className="panel source-panel">
      <div className="section-title">
        <h2>来源追踪</h2>
        <span>{traces.length} 条</span>
      </div>
      <div className="source-list">
        {traces.slice(0, 8).map((trace) => (
          <a key={`${trace.sourceName}-${trace.rawRecordId}-${trace.fieldPath}`} href={trace.sourceUrl} target="_blank" rel="noreferrer">
            <div>
              <strong>{trace.sourceName}</strong>
              <span>{trace.fieldPath}</span>
              <p>{trace.quote}</p>
            </div>
            <ExternalLink size={15} />
          </a>
        ))}
      </div>
    </section>
  );
}

