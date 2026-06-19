export function MetaValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="truncate font-mono text-xs">{value}</span>
    </div>
  )
}
