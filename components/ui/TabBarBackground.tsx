// This is a shim for web and Android where the tab bar is generally opaque.
export default undefined;

export function useBottomTabOverflow(includeBottomTab: boolean) {
  if (!includeBottomTab) return 0;
  return 0;
}
