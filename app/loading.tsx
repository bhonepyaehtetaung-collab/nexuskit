/** Shown instantly while the next page loads, so taps feel immediate. */
export default function Loading() {
  return (
    <div className="container-page animate-fade-in space-y-6 py-6" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-48 animate-pulse rounded-xl bg-raised" />
      <div className="h-4 w-72 max-w-full animate-pulse rounded-lg bg-raised" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square animate-pulse rounded-2xl bg-raised" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-raised" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-raised" />
          </div>
        ))}
      </div>
    </div>
  );
}
