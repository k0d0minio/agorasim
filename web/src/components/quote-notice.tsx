/**
 * The quote page's status panel — "confirming your payment", "waiting for
 * your payment", "the balance is paid from …". One component for the page
 * (a server component) and the pay form (a client one): it holds no state,
 * so it renders in either.
 */
export function QuoteNotice({
  icon,
  title,
  body,
}: {
  icon?: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div role="status" className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
      {icon ? <span className="mt-0.5 text-primary">{icon}</span> : null}
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}
