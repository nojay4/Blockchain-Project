/**
 * SportsBetting contract on Sepolia. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` in `web/.env.local`
 * (same value as root `CONTRACT_ADDRESS`). Next only exposes `NEXT_PUBLIC_*` to the browser.
 */
export function getSportsBettingContractAddress(): `0x${string}` | undefined {
  let raw = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS?.trim();
  if (!raw) return undefined;
  if (!raw.startsWith("0x")) raw = `0x${raw}`;
  if (!/^0x[0-9a-fA-F]{40}$/.test(raw)) return undefined;
  return raw as `0x${string}`;
}
