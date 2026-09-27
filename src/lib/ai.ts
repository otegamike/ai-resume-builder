import "server-only";

// Compatibility shim while consumers migrate to `@/lib/ai/*`.
// The implementation now lives in `src/lib/ai/`. New code should import
// from `@/lib/ai/index` (or the specific feature module) and from
// `@/types/*` for shared shapes.
export * from "./ai/index";
