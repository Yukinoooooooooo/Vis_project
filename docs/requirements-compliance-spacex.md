# SpaceX 热点事件科技板联动版需求对照

对照文件：`虚拟现实与可视化 (1).zip`。

## 压缩包核心要求

参考工程定义的是 A1-A7 七个业务模块，并强调：A7 只能作为页面/工作台组装层，A1-A6 通过明确路由提供数据。原型本身允许 mock，其中 A5、A6 在压缩包里还是占位逻辑。

- A1 热点事件：事件对象、状态、时间窗。
- A2 传播图谱：传播图、节点摘要、路径摘要。
- A3 联动对象图谱：对象分组、公司/对象预览、联动摘要。
- A4 信号分析：指标查询、对比、排名/异常快照。
- A5 证据引擎：证据包、判断摘要、边界说明。
- A6 观察中心：观察项、动态流、规则。
- A7 工作台：统一组装前端视图。

## 当前工程覆盖情况

| 模块 | 当前实现 | 状态 |
| --- | --- | --- |
| A1 热点事件 | `spacexConnector` 生成 SpaceX 公开来源时间线；中心事件为 Starship Flight 5；保留监管、后续飞行、估值报道节点。 | 已覆盖，且替换 mock 为来源可追踪事件 |
| A2 传播图谱 | `getPropagationMapView` 与 `/constellation` 使用同源、同主题、时间滞后和事件-节点关系生成图谱。 | 已覆盖，星图为 3D 主视图 |
| A3 联动对象图谱 | `getNodeExposureView` 基于真实来源字段生成节点/商品/地区联动对象；SpaceX 私有公司不展示无来源企业或股价影响。 | 部分覆盖，企业级影响因公开数据限制保持保守 |
| A4 信号分析 | `techTradeWindowConnector` 使用 Census HS 进口额计算事件窗 z-score、峰值、领先/滞后。 | 已覆盖，指标是公开贸易代理变量 |
| A5 证据引擎 | 每个事件、关系、联动对象生成 evidence card，包含 sourceUrl、fetchedAt、quoteFields、factType。 | 已覆盖，强于压缩包占位 |
| A6 观察中心 | `/views/watch-workspace` 展示观察项、阈值、触发说明和来源追踪。 | 基本覆盖，后续可增强为可编辑规则 |
| A7 工作台 | `apps/web` 路由与 `viewService` 统一组装雷达、星图、详情、传播、联动对象、证据、观察页面。 | 已覆盖 |

## SpaceX 科技板联动分析边界

- SpaceX 是非上市公司，系统不伪造股价或财报指标。
- 联动方向采用两类公开事实：SpaceX/FAA/CNBC 等公开事件事实，以及 Census 国际贸易 HS 维度进口额作为科技链代理指标。
- z-score 计算规则：`z=(GEN_VAL_MO-baselineMean)/sampleStdDev`，基准窗为 2024-01 到 2024-07，事件窗为 2024-08 到 2024-11，阈值为 `z>=1.6`。
- 所有规则推导在页面中标注为 computedSignal 或 ruleDerived，不作为确定因果结论或投资建议。

## 当前数据快照

- 数据源：SpaceX Public Hot Event Timeline、Census Tech Chain Trade Window。
- 事件数：15。
- 证据卡：45。
- 中心事件：SpaceX Starship Flight 5 booster catch and flight test。
