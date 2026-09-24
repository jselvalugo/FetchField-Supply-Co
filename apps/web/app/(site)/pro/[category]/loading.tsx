import { Skeleton } from "@fetchfield/ui";

export default function Loading() {
  return (
    <div className="wrap" aria-busy="true" aria-label="Loading products">
      <div className="page-head"><Skeleton style={{ width: "40%", height: "3.5rem" }} /></div>
      <div className="section grid gap-3 pt-10">
        {Array.from({ length: 5 }, (_, i) => <Skeleton key={i} style={{ height: "5rem" }} />)}
      </div>
    </div>
  );
}
