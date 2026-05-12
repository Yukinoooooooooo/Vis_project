import type { FactType } from "@risk-map/shared";

const labels: Record<FactType, string> = {
  directFact: "来源事实",
  computedSignal: "计算信号",
  ruleDerived: "规则推导"
};

export function FactBadge({ factType }: { factType: FactType }) {
  return <span className={`fact-badge ${factType}`}>{labels[factType]}</span>;
}

