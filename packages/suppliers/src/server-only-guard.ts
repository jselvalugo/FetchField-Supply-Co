// The package root holds supplier credentials logic. If a bundler ever pulls
// it into browser code, fail loudly instead of shipping it.
if (typeof window !== "undefined") {
  throw new Error("@fetchfield/suppliers is server-only. Import a safe subpath (/pricing, /delivery, /public) in client code.");
}
export {};
