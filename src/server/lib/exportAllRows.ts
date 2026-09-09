/**
 * Collect every row behind a paginated table for CSV/Sheets export, rather
 * than only the page the user happens to be looking at.
 *
 * Walks the table's own page service instead of re-querying the provider
 * directly, so filters, scope, sorting and caching stay identical to what the
 * table shows. An export that quietly disagrees with the table on screen is
 * worse than one that is short.
 *
 * Cloudflare caps subrequests per request (50 on the free Workers plan, 1000
 * on paid), and each page here is one provider call. An unbounded walk would
 * therefore fail the whole export on a large domain instead of returning a big
 * file, so {@link EXPORT_MAX_PAGES} bounds it. The bound is a platform limit,
 * not a cost preference: `truncated` reports when it was reached so callers can
 * tell the user the file is partial instead of silently shipping less than
 * asked for.
 */

/** Provider maximum rows per list request — fewer pages for the same rows. */
export const EXPORT_PAGE_SIZE = 100;

/**
 * Leaves headroom under the free plan's 50-subrequest ceiling for the other
 * calls a request makes (auth, billing, cache). Raise once the account is on a
 * paid Workers plan, where the ceiling is 1000.
 */
export const EXPORT_MAX_PAGES = 40;

export type ExportAllRowsResult<Row> = {
  rows: Row[];
  totalCount: number | null;
  /** True when EXPORT_MAX_PAGES stopped the walk before the table ran out. */
  truncated: boolean;
};

export async function collectAllRows<Row>(
  fetchPage: (page: number) => Promise<{
    rows: Row[];
    hasMore: boolean;
    totalCount: number | null;
  }>,
  maxPages: number = EXPORT_MAX_PAGES,
): Promise<ExportAllRowsResult<Row>> {
  const rows: Row[] = [];
  let totalCount: number | null = null;

  // Pages are 1-based across the table services (offset = (page - 1) * size).
  for (let page = 1; page <= maxPages; page += 1) {
    const result = await fetchPage(page);
    if (result.totalCount != null) totalCount = result.totalCount;
    rows.push(...result.rows);
    // An empty page still ends the walk: hasMore falls back to a full-page
    // heuristic when the provider omits totalCount, so trust the page itself.
    if (!result.hasMore || result.rows.length === 0) {
      return { rows, totalCount, truncated: false };
    }
  }

  return { rows, totalCount, truncated: true };
}
