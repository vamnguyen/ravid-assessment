import { ConnectionCard } from "@/features/auth/components/ConnectionCard"

export function ConnectionPage() {
  return (
    <section className="grid gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(20rem,0.25fr)]">
      <ConnectionCard />
      <div className="hidden rounded-lg border border-dashed bg-background p-4 text-sm text-muted-foreground lg:block">
        Configure the backend URL, register or login, then continue to Documents
        and Chat from the navigation.
      </div>
    </section>
  )
}
