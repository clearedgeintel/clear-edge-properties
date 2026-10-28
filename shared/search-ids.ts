// Shared by client and server so both derive the same `properties.zpid` for a
// live external search result. Zillow supplies a real zpid; other platforms use
// their own listing id, namespaced to avoid colliding with Zillow ids on the
// shared zpid primary key (e.g. "crexi-12345", "loopnet-678").
export function searchResultZpid(result: { id?: string | number | null; platform?: string | null }): string {
  const raw = (result.id ?? '').toString().trim();
  if (!raw) return '';
  const platform = result.platform || 'zillow';
  return platform === 'zillow' ? raw : `${platform}-${raw}`;
}

/** Inverse of searchResultZpid's namespacing: which platform a zpid came from. */
export function platformFromZpid(zpid: string): string {
  const match = /^(loopnet|redfin|crexi)-/.exec(zpid);
  return match ? match[1] : 'zillow';
}
