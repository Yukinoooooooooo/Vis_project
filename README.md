# 产业风险地图

一个本地运行的 TypeScript 全栈工作台，用公开数据源构建产业风险观察、传播路径、暴露对象、证据卡和观察名单。

## 核心约束

- 页面事实必须带 `sourceUrl`、`fetchedAt`、`rawRecordId`。
- 传播边和暴露关系必须标注 `directFact`、`computedSignal` 或 `ruleDerived`。
- 首版不提供投资建议，只呈现公开数据观察和可追溯证据链。

## 运行

```bash
npm install
npm run data:refresh
npm run dev
```

前端默认运行在 `http://localhost:5173`，API 默认运行在 `http://localhost:4317`。

## 数据刷新

`npm run data:refresh` 会调用 GDELT、SEC EDGAR、Census、BLS、USGS、openFDA、NHTSA、ReliefWeb 等公开接口，生成本地快照到 `apps/api/data/cache/latest-snapshot.json`。该文件是运行时缓存，不提交到仓库。

