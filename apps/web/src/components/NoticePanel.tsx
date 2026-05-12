import type { PartialDataNotice } from "@risk-map/shared";
import { AlertTriangle } from "lucide-react";

export function NoticePanel({ notices }: { notices: PartialDataNotice[] }) {
  if (!notices.length) return null;
  return (
    <div className="notice-panel">
      <AlertTriangle size={17} />
      <div>
        {notices.map((notice) => (
          <p key={`${notice.sourceName}-${notice.message}`}>
            <strong>{notice.sourceName}</strong>：{notice.message}
          </p>
        ))}
      </div>
    </div>
  );
}

