import { useState } from "react";
import {
  ChevronDown,
  Download,
  Gauge,
  MoreHorizontal,
  Sheet,
} from "lucide-react";
import type { CsvValue } from "@/client/lib/csv";
import { exportTableToSheets } from "@/client/lib/exportToSheets";
import type { BacklinksSearchState } from "./backlinksPageTypes";
import { exportBacklinksTabCsv } from "./export";

export function BacklinksExportMenu({
  activeTab,
  exportTarget,
  rows,
  loadExportTable,
}: {
  activeTab: BacklinksSearchState["tab"];
  exportTarget: string;
  /** The visible page — only used to decide whether exporting is possible. */
  rows: CsvValue[][];
  /**
   * Fetches the whole filtered result set. `rows` stays the visible page and is
   * only used to decide whether exporting is possible at all.
   */
  loadExportTable: () => Promise<{ headers: string[]; rows: CsvValue[][] }>;
}) {
  const [isExporting, setIsExporting] = useState(false);
  const canExport = rows.length > 0 && !isExporting;

  const runExport = async (
    use: (table: { headers: string[]; rows: CsvValue[][] }) => unknown,
  ) => {
    if (!canExport) return;
    setIsExporting(true);
    try {
      await use(await loadExportTable());
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportToSheets = () =>
    runExport((table) =>
      exportTableToSheets({
        headers: table.headers,
        rows: table.rows,
        feature: `backlinks_${activeTab}`,
      }),
    );

  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className={`btn btn-sm btn-ghost gap-1 ${rows.length === 0 ? "btn-disabled" : ""}`}
        aria-label="Export backlinks table"
      >
        <Download className="size-4" />
        Export
        <ChevronDown className="size-3 opacity-60" />
      </div>
      <ul
        tabIndex={0}
        role="menu"
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-56"
      >
        <li>
          <button
            type="button"
            onClick={() => void handleExportToSheets()}
            disabled={!canExport}
          >
            {isExporting ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Sheet className="size-4" />
            )}
            Export to Sheets
          </button>
        </li>
        <li>
          <button
            type="button"
            onClick={() =>
              void runExport((table) =>
                exportBacklinksTabCsv({
                  tab: activeTab,
                  target: exportTarget,
                  headers: table.headers,
                  rows: table.rows,
                }),
              )
            }
            disabled={!canExport}
          >
            <Download className="size-4" />
            Export CSV
          </button>
        </li>
      </ul>
    </div>
  );
}

export function BacklinksActionsMenu({
  isLoadingRatings,
  loadRatings,
  ratableDomains,
}: {
  isLoadingRatings: boolean;
  loadRatings: (domains: string[]) => void | Promise<void>;
  ratableDomains: string[];
}) {
  return (
    <div className="dropdown dropdown-end">
      <div
        tabIndex={0}
        role="button"
        className="btn btn-sm btn-ghost btn-square"
        aria-label="Backlinks table actions"
        title="Backlinks table actions"
      >
        <MoreHorizontal className="size-4" />
      </div>
      <ul
        tabIndex={0}
        role="menu"
        className="dropdown-content z-10 menu p-2 shadow-lg bg-base-100 border border-base-300 rounded-box w-52"
      >
        <li>
          <button
            type="button"
            onClick={() => void loadRatings(ratableDomains)}
            disabled={isLoadingRatings}
            title="Look up Ahrefs Domain Rating for each domain in the table"
          >
            {isLoadingRatings ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <Gauge className="size-4" />
            )}
            Ahrefs DR
          </button>
        </li>
      </ul>
    </div>
  );
}
