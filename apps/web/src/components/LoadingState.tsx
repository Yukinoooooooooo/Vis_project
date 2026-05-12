export function LoadingState({ label = "正在读取公开数据快照" }: { label?: string }) {
  return <div className="loading-state">{label}</div>;
}

