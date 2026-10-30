export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-4">
      {Icon && <div className="h-12 w-12 rounded-full bg-accent/10 text-accent grid place-items-center mb-3"><Icon className="h-6 w-6" aria-hidden /></div>}
      <h3 className="font-semibold">{title}</h3>
      {text && <p className="text-sm text-muted mt-1 max-w-sm">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
export const ErrorState = ({ message, onRetry }) => (
  <div role="alert" className="flex flex-col items-center text-center py-10 px-4">
    <p className="text-sm text-danger">{message}</p>
    {onRetry && <button className="btn-secondary mt-3" onClick={onRetry}>Try again</button>}
  </div>
);
