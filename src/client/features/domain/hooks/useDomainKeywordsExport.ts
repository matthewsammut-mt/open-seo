import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  domainKeywordsPayload,
  toFiltersPayload,
  type DomainKeywordsQueryInput,
} from "@/client/features/domain/hooks/useDomainKeywordsQuery";
import { keywordsToTable } from "@/client/features/domain/utils";
import { buildCsv, downloadCsv } from "@/client/lib/csv";
import { captureClientEvent } from "@/client/lib/posthog";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { exportDomainKeywords } from "@/serverFunctions/domain";

/**
 * CSV/Sheets export for the domain Keywords tab. Takes the same query input the
 * table renders from, so the file always covers exactly the rows the current
 * scope, filters and sort match — every page of them, not just the visible one.
 *
 * Mirrors useSavedKeywordsExport: the row set is fetched on demand rather than
 * read out of the table's page cache.
 */
export function useDomainKeywordsExport(params: {
  input: DomainKeywordsQueryInput;
  fileNamePrefix: string;
}) {
  const { input, fileNamePrefix } = params;
  const [exporting, setExporting] = useState(false);

  const loadTable = useCallback(async () => {
    const result = await exportDomainKeywords({
      data: domainKeywordsPayload(
        input,
        toFiltersPayload(input.appliedFilters),
      ),
    });
    if (result.truncated) {
      const of = result.totalCount
        ? ` of ${result.totalCount.toLocaleString()}`
        : "";
      toast.warning(
        `Exported the first ${result.keywords.length.toLocaleString()} keywords${of} — narrow the filters to export the rest.`,
      );
    }
    return keywordsToTable(result.keywords);
  }, [input]);

  const run = useCallback(
    async (use: (table: ReturnType<typeof keywordsToTable>) => unknown) => {
      if (exporting) return;
      setExporting(true);
      try {
        await use(await loadTable());
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not export keywords",
        );
      } finally {
        setExporting(false);
      }
    },
    [exporting, loadTable],
  );

  return {
    exporting,
    exportToSheets: () =>
      void run((table) =>
        exportTableToSheets({
          headers: table.headers,
          rows: table.rows,
          feature: "domain_overview",
        }),
      ),
    download: (extension: "csv" | "xls") =>
      void run((table) => {
        downloadCsv(
          `${fileNamePrefix}-keywords.${extension}`,
          buildCsv(table.headers, table.rows),
        );
        if (extension === "csv") {
          captureClientEvent("data:export", {
            source_feature: "domain_overview",
            result_count: table.rows.length,
          });
        }
      }),
  };
}
