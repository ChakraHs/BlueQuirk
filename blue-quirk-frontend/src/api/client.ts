// Backwards-compatible alias. There is ONE Axios client in the app, defined in
// `src/services/api.ts` (single base URL, token convention and refresh flow).
// Older imports of `@/api/client` keep working by re-exporting it.
export { default, storeTokens, clearTokens } from "@/services/api";
