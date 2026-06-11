/** Matches platform demo stores created in server/demo.ts */
export const DEMO_STORE_NAME_PREFIX = "IQ-POS Demo";

export function isDemoStore(store: { name: string }): boolean {
  return store.name.startsWith(DEMO_STORE_NAME_PREFIX);
}
