import { useState } from "react";
import { toast } from "sonner";
import { pagesToTable } from "@/client/features/domain/utils";
import { getStandardErrorMessage } from "@/client/lib/error-messages";
import { exportRows, type ExportFormat } from "@/client/lib/exportRows";
import { exportDomainPages } from "@/serverFunctions/domain";
import {
  domainPagesPayload,
  type DomainPagesQueryInput,
} from "./useDomainPagesQuery";

/**
 * Exports every page matching the table's current filters, not just the
 * visible page of results. See useDomainKeywordsExport.
 */
export function useDomainPagesExport(params: {
  queryInput: DomainPagesQueryInput;
  filenamePrefix: string;
}) {
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  const exportAll = async (format: ExportFormat) => {
    if (exporting) return;
    setExporting(format);
    try {
      const result = await exportDomainPages({
        data: domainPagesPayload(params.queryInput),
      });
      if (result.truncated) {
        toast.warning(
          `Exported the first ${result.pages.length.toLocaleString()} pages. Narrow the filters to export the rest.`,
        );
      }
      await exportRows({
        format,
        feature: "domain_overview",
        ...pagesToTable(result.pages),
        filename: `${params.filenamePrefix}-pages`,
        records: result.pages,
      });
    } catch (error) {
      toast.error(getStandardErrorMessage(error, "Could not export"));
    } finally {
      setExporting(null);
    }
  };

  return { exportAll, exporting };
}
