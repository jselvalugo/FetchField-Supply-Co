import Link from "next/link";
import { EmptyState, Logo, buttonClass } from "@fetchfield/ui";

export default function NotFound() {
  return (
    <main id="main" className="wrap section">
      <Link href="/" aria-label="FetchField home"><Logo /></Link>
      <p className="eyebrow mt-12 mb-0">404</p>
      <EmptyState title="This trail doesn't go anywhere" action={
        <div className="flex flex-wrap gap-3">
          <Link href="/pro" className={buttonClass("secondary")}>Pro equipment</Link>
          <Link href="/shop" className={buttonClass("secondary")}>Shop</Link>
        </div>
      }>
        <p className="m-0">The page may have moved, or the link has a typo.</p>
      </EmptyState>
    </main>
  );
}
