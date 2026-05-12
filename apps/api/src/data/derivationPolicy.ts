import type { DerivationPolicy } from "@risk-map/shared";

export const derivationPolicy: DerivationPolicy = {
  summary:
    "页面只把公开源直接返回的字段展示为 directFact；事件窗异动分值由公开字段按固定规则计算为 computedSignal；传播边和联动对象推断必须显示 ruleDerived 规则。",
  allowedFactTypes: ["directFact", "computedSignal", "ruleDerived"],
  rules: [
    {
      ruleId: "source-record-to-event",
      label: "公开记录生成热点事件",
      description: "把公开 API 的新闻、召回、灾害、披露或统计记录转换为事件卡；标题、时间和摘要必须来自原始字段。",
      factType: "directFact",
      requiredInputs: ["SourceRecord.title", "SourceRecord.sourceUrl", "SourceRecord.quotedFields"]
    },
    {
      ruleId: "source-fields-to-chain-nodes",
      label: "来源字段映射为科技链/板块节点",
      description: "将产品/商品、企业/机构、地区字段映射为联动节点；节点名称仍取自公开源字段。",
      factType: "ruleDerived",
      requiredInputs: ["productOrCommodityName", "primaryEntityName", "regionName"]
    },
    {
      ruleId: "field-proximity-to-propagation-edge",
      label: "同一公开记录内字段邻近生成传播边",
      description: "如果同一公开记录同时包含产品、企业、地区字段，则生成可解释链路，但不表达强因果。",
      factType: "ruleDerived",
      requiredInputs: ["sourceTrace", "node.sourceUrl"]
    },
    {
      ruleId: "severity-hint-to-signal-score",
      label: "来源等级映射异常分值",
      description: "将公开源中的分类、震级或召回等级映射为 0-100 分异常信号。",
      factType: "computedSignal",
      requiredInputs: ["severityHint", "quotedFields"]
    },
    {
      ruleId: "event-window-zscore",
      label: "事件窗 z-score 代理指标",
      description: "按 PPT 设计，用公开时间序列在基准窗内计算均值和样本标准差，再将事件窗数值标准化；阈值 z≥1.6 表示显著异常。",
      factType: "computedSignal",
      requiredInputs: ["GEN_VAL_MO", "baselineWindow", "eventWindow", "threshold"]
    },
    {
      ruleId: "financial-hotspot-focus-selection",
      label: "国际热点优先中心事件",
      description: "默认星图优先选择带中心热点标签的公开热点事件，再连接科技链时间序列代理指标。",
      factType: "ruleDerived",
      requiredInputs: ["themeTags", "financialMetric", "sourceTrace"]
    },
    {
      ruleId: "named-firm-to-exposure",
      label: "被公开源点名的企业形成重点观察对象",
      description: "FDA、NHTSA、SEC 等公开源直接点名公司或机构时，生成重点观察项。",
      factType: "directFact",
      requiredInputs: ["primaryEntityName", "sourceUrl"]
    }
  ]
};
