import { Skeleton } from "@fetchfield/ui";

/** Skeleton that matches the real listing layout, so nothing jumps when it loads. */
export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Loading products">
      <div className="page-head"><Skeleton style={{ width: "40%", height: "3.5rem" }} /><Skeleton className="mt-4" style={{ width: "60%", height: "1.2rem" }} /></div>
      <div className="listing">
        <div className="grid content-start gap-4">{[0, 1, 2].map((i) => <Skeleton key={i} style={{ height: "4rem" }} />)}</div>
        <div className="shop-grid">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid gap-2"><Skeleton style={{ aspectRatio: "4 / 5" }} /><Skeleton style={{ height: "1rem", width: "70%" }} /><Skeleton style={{ height: "1rem", width: "40%" }} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
