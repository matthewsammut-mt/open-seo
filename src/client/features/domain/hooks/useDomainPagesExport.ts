import { useCallback, useState } from "react";
import { toast } from "sonner";
import {
  domainPagesPayload,
  type DomainPagesQueryInput,
} from "@/client/features/domain/hooks/useDomainPagesQuery";
import { pagesToTable } from "@/client/features/domain/utils";
import { buildCsv, downloadCsv } from "@/client/lib/csv";
import { captureClientEvent } from "@/client/lib/posthog";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import { exportDomainPages } from "@/serverFunctions/domain";

/**
 * CSV/Sheets export for the domain Pages tab — every page the current scope,
 * filters and sort match, not just the row set on screen. See
 * useDomainKeywordsExport for the shape this mirrors.
 */
export function useDomainPagesExport(params: {
  input: DomainPagesQueryInput;
  fileNamePrefix: string;
}) {
  const { input, fileNamePrefix } = params;
  const [exporting, setExporting] = useState(false);

  const loadTable = useCallback(async () => {
    const result = await exportDomainPages({ data: domainPagesPayload(input) });
    if (result.truncated) {
      const of = result.totalCount
        ? ` of ${result.totalCount.toLocaleString()}`
        : "";
      toast.warning(
        `Exported the first ${result.pages.length.toLocaleString()} pages${of} — narrow the filters to export the rest.`,
      );
    }
    return pagesToTable(result.pages);
  }, [input]);

  const run = useCallback(
    async (use: (table: ReturnType<typeof pagesToTable>) => unknown) => {
      if (exporting) return;
      setExporting(true);
      try {
        await use(await loadTable());
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not export pages",
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
          `${fileNamePrefix}-pages.${extension}`,
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
