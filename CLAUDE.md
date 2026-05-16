# 热点事件科技板联动看板

## 项目定位
一个本地运行的 TypeScript 全栈工作台，用公开数据追踪国际热点事件，观察其对科技板块、科技链代理指标和相关事件的联动影响。

## 核心约束（不可违反）
- 所有页面事实必须携带 `sourceUrl`、`fetchedAt`、`rawRecordId`
- 传播边和联动关系必须标注事实类型：`directFact` / `computedSignal` / `ruleDerived`
- 不提供投资建议；使用限定语表明是代理观察而非因果结论
- 使用中文界面和中文注释

## 技术栈
- **Monorepo**: npm workspaces
- **后端**: Express 5 + TypeScript (ESM)
- **前端**: React 19 + TypeScript + Vite
- **数据获取**: fetch + curl fallback
- **状态管理**: Zustand + TanStack React Query
- **可视化**: Three.js (3D 星图), ReactFlow (传播图), Recharts (信号图)
- **测试**: Vitest + Testing Library
- **端口**: API=4317, Web=5173 (Vite 代理 API 路由)

## 目录结构

```
/
├── packages/shared/src/     # 共享类型 (types.ts + branding.ts)
├── apps/api/src/            # 后端
│   ├── server.ts            # 入口
│   ├── app.ts               # Express 应用
│   ├── config.ts            # 配置
│   ├── routes/              # views.ts, commands.ts, admin.ts
│   ├── services/            # viewService.ts (核心), commandService.ts
│   ├── data/                # types.ts, cache.ts, buildSnapshot.ts, refresh.ts, derivationPolicy.ts
│   └── connectors/          # spacex.ts, techTradeWindow.ts (及 8 个未注册源)
└── apps/web/src/            # 前端
    ├── app/App.tsx          # 路由配置
    ├── pages/               # 7 个页面组件
    ├── components/          # 通用 UI + Three.js 场景
    ├── stores/workspace.ts  # Zustand store
    └── services/api.ts      # API 客户端
```

## 数据流

```
Connector.fetchRecords() → SourceRecord[]
  → buildSnapshot() → RiskSnapshot (JSON 快照文件)
  → viewService.getXxxView() → View 对象
  → Express 路由 → JSON → React Query → 前端渲染
```

## 快照文件: `apps/api/data/cache/latest-snapshot.json` (gitignored)

## 核心 API

| 路由 | 方法 | 说明 |
|------|------|------|
| `/views/radar` | GET | 分析总览 |
| `/views/constellation?eventId=` | GET | 扩散星图 |
| `/views/events/:eventId/overview` | GET | 事件详情 |
| `/views/events/:eventId/propagation-map` | GET | 传播地图 |
| `/views/events/:eventId/nodes/:nodeId/exposure` | GET | 联动节点 |
| `/views/events/:eventId/evidence-assessment?targetType=&targetId=` | GET | 证据复核 |
| `/views/watch-workspace` | GET | 观察名单 |
| `/commands/watch-items` | POST | 添加观察项 |
| `/admin/data/refresh` | POST | 触发刷新 |

## 关键类型体系

- **FactType**: directFact │ computedSignal │ ruleDerived
- **EvidenceLevel**: E1-E4 (证据层级)
- **JudgmentLevel**: J1-J4 (判断强度)
- **SeverityLevel**: low │ medium │ high │ critical
- **EventStatus**: new │ tracking │ expanding │ stabilizing │ closed
- **SourceTrace**: 携带 sourceName/sourceUrl/fetchedAt/rawRecordId/fieldPath/quote

## 构建视图

```bash
npm install
npm run data:refresh   # 生成快照
npm run dev            # 并行启动 API+Web
npm test               # 运行所有测试
```

## 重要说明

1. **viewService.ts** 是后端核心逻辑（~664 行），包含热度评分、相似度评分、默认焦点选择等算法。
2. 实际注册的 connector 只有 2 个：`spacex` 和 `techTradeWindow`。其余 8 个（gdelt/sec/census/bls/openfda/nhtsa/reliefweb/usgs）已定义但**未注册**，如需启用要在 `connectors/index.ts` 中添加。
3. 前端路由定义在 `apps/web/src/app/App.tsx`，默认首页 `/radar`。
4. 3D 星图渲染在 `EventConstellationScene.tsx`，使用 Three.js。
5. 传播地图使用 ReactFlow，信号图表使用 Recharts。
