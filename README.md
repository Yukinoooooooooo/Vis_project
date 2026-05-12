# 热点事件科技板联动看板

一个本地运行的 TypeScript 全栈工作台，用公开数据追踪国际热点事件，观察其对科技板块、科技链代理指标和相关事件的联动影响，并用传播图谱、事件窗指标、证据卡和观察名单展示可追溯链路。

## 核心约束

- 页面事实必须带 `sourceUrl`、`fetchedAt`、`rawRecordId`。
- 传播边和联动/点名关系必须标注 `directFact`、`computedSignal` 或 `ruleDerived`。
- 首版不提供投资建议，只呈现公开数据观察、事件窗异动和可追溯证据链。

## 运行

```bash
npm install
npm run data:refresh
npm run dev
```

前端默认运行在 `http://localhost:5173`，API 默认运行在 `http://localhost:4317`。

## 数据刷新

`npm run data:refresh` 会调用 GDELT、SEC EDGAR、Census、BLS、USGS、openFDA、NHTSA、ReliefWeb 等公开接口，生成本地快照到 `apps/api/data/cache/latest-snapshot.json`。该文件是运行时缓存，不提交到仓库。
