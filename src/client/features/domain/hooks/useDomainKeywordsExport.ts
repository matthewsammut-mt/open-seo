import { useState } from "react";
import { toast } from "sonner";
import { keywordsToTable } from "@/client/features/domain/utils";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { exportRows, type ExportFormat } from "@/client/lib/exportRows";
import { exportDomainKeywords } from "@/serverFunctions/domain";
import {
  domainKeywordsPayload,
  type DomainKeywordsQueryInput,
} from "./useDomainKeywordsQuery";

/**
 * Exports every keyword matching the table's current filters, not just the
 * visible page. Rows are fetched on demand rather than kept in the query
 * cache, so opening the export menu costs nothing.
 */
export function useDomainKeywordsExport(params: {
  queryInput: DomainKeywordsQueryInput;
  filenamePrefix: string;
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const exportAll = async (format: ExportFormat) => {
    // The menu stays clickable while a download runs; a second click would
    // pay for the same walk twice.
    if (exporting) return;
    setExporting(format);
    try {
      const result = await exportDomainKeywords({
        data: domainKeywordsPayload(params.queryInput),
      });
      if (result.truncated) {
        toast.warning(
          `Exported the first ${result.keywords.length.toLocaleString()} keywords. Narrow the filters to export the rest.`,
        );
      }
      await exportRows({
        format,
        feature: "domain_overview",
        ...keywordsToTable(result.keywords),
        filename: `${params.filenamePrefix}-keywords`,
        records: result.keywords,
      });
    } catch (error) {
      toast.error(getStandardErrorMessage(error, "Could not export"));
    } finally {
      setExporting(null);
    }
  };

  return { exportAll, exporting };
}
