import { describe, expect, it } from "vitest";
import { collectAllRows } from "@/server/lib/exportAllRows";

function pager(pages: number[][], hasMoreAfterLast = false) {
  const seen: number[] = [];
  return {
    seen,
    fetchPage: async (page: number) => {
      seen.push(page);
      const rows = pages[page - 1] ?? [];
      return {
        rows,
        hasMore: page < pages.length ? true : hasMoreAfterLast,
        totalCount: pages.flat().length,
      };
    },
  };
}

describe("collectAllRows", () => {
  it("walks every page and concatenates the rows in order", async () => {
    const { fetchPage, seen } = pager([[1, 2], [3, 4], [5]]);
    const result = await collectAllRows(fetchPage);

    expect(result.rows).toEqual([1, 2, 3, 4, 5]);
    expect(result.truncated).toBe(false);
    expect(seen).toEqual([1, 2, 3]);
  });

  it("reports truncation when maxPages stops the walk early", async () => {
    const { fetchPage } = pager([[1], [2], [3]], true);
    const result = await collectAllRows(fetchPage, 2);

    expect(result.rows).toEqual([1, 2]);
    expect(result.truncated).toBe(true);
  });

  // A provider that keeps claiming hasMore while returning nothing would
  // otherwise spin until maxPages, spending a request per empty page.
  it("stops on an empty page even when hasMore stays true", async () => {
    const { fetchPage, seen } = pager([[1], []], true);
    const result = await collectAllRows(fetchPage, 10);

    expect(result.rows).toEqual([1]);
    expect(result.truncated).toBe(false);
    expect(seen).toEqual([1, 2]);
  });
});
