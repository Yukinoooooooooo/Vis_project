export function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-state">
      <strong>加载失败</strong>
      <p>{message}</p>
    </div>
  );
}

