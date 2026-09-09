import { useCallback, useMemo, useState } from "react";
import { Copy, Download, FileSpreadsheet, Sheet } from "lucide-react";
import { toast } from "sonner";
import { DomainKeywordsPagination } from "@/client/features/domain/components/DomainKeywordsPagination";
import { DomainFilterPanel } from "@/client/features/domain/components/DomainFilterPanel";
import { DomainPagesTable } from "@/client/features/domain/components/DomainPagesTable";
import { DomainTableTabSurface } from "@/client/features/domain/components/DomainTableTabSurface";
import {
  PAGE_FILTER_FIELDS,
  buildPagesClearSearchUpdate,
  buildPagesSearchUpdate,
  countPageFilterConditions,
} from "@/client/features/domain/domainFilterUtils";
import {
  debugDomain,
  useDomainRenderDebug,
} from "@/client/features/domain/domainDebug";
import { useDomainPagesQuery } from "@/client/features/domain/hooks/useDomainPagesQuery";
import { useDomainPageFilterPreferences } from "@/client/features/domain/useDomainFilterPreferences";
import {
  EMPTY_DOMAIN_FILTERS,
  type DomainSortMode,
  type PageRow,
  type PagesFilterValues,
} from "@/client/features/domain/types";
import { useDomainPagesExport } from "@/client/features/domain/hooks/useDomainPagesExport";
import type { DomainOverviewRouteState } from "@/client/features/domain/domainRouteState";
import {
  MAX_DATAFORSEO_FILTER_CONDITIONS,
  type DomainSearchParams,
} from "@/types/schemas/domain";
import {
  RESEARCH_SCOPE_FILTER_SLOTS,
  type ResearchScope,
} from "@/shared/researchScope";

type SearchUpdate = Partial<DomainSearchParams>;

const EMPTY_PAGES_ROWS: PageRow[] = [];
const PAGE_TEXT_FILTERS = [
  {
    key: "include",
    label: "Include Page Terms",
    placeholder: "pricing, tools, guides",
  },
  {
    key: "exclude",
    label: "Exclude Page Terms",
    placeholder: "blog, tag, archive",
  },
] as const;
const PAGE_RANGE_FILTERS = [
  { title: "Traffic", minKey: "minTraffic", maxKey: "maxTraffic" },
  { title: "Keywords", minKey: "minVol", maxKey: "maxVol" },
] as const;

type Props = {
  projectId: string;
  /** Research target as displayed: hostname, plus the path for URL scopes. */
  target: string;
  /** Hostname only, for resolving relative result URLs. */
  hostname: string;
  scope: ResearchScope;
  routeState: DomainOverviewRouteState;
  setSearchParams: (updates: SearchUpdate) => void;
  onSortClick: (sort: DomainSortMode) => void;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (nextSize: number) => void;
};

export function PagesTab({
  projectId,
  target,
  hostname,
  scope,
  routeState,
  setSearchParams,
  onSortClick,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);
  // Scope filters consume part of DataForSEO's fixed filter budget.
  const maxConditions =
    MAX_DATAFORSEO_FILTER_CONDITIONS - RESEARCH_SCOPE_FILTER_SLOTS.pages[scope];
  const filterPreferences = useDomainPageFilterPreferences(
    `${projectId}:${target}`,
  );
  const {
    filters: preferredFilters,
    save: savePreferredFilters,
    clear: clearPreferredFilters,
  } = filterPreferences;
  const restoredFilters = useMemo(
    () =>
      routeState.hasAppliedPageFilters
        ? routeState.appliedPageFilters
        : preferredFilters,
    [
      preferredFilters,
      routeState.appliedPageFilters,
      routeState.hasAppliedPageFilters,
    ],
  );
  // Filters restored from the URL or saved preferences can exceed this
  // scope's tighter budget; sending them would make the server reject the
  // whole query, so hold them back and let the panel explain.
  const filtersOverBudget =
    countPageFilterConditions(restoredFilters) > maxConditions;
  const appliedPagesFilters = filtersOverBudget
    ? EMPTY_DOMAIN_FILTERS
    : restoredFilters;

  // Shared with the export hook so a CSV can't disagree with the table.
  const queryInput = {
    projectId,
    domain: target,
    scope,
    locationCode: routeState.sentLocationCode,
    page: routeState.page,
    pageSize: routeState.pageSize,
    sortMode: routeState.sort,
    sortOrder: routeState.order,
    appliedFilters: appliedPagesFilters,
    enabled: Boolean(target),
  };
  const query = useDomainPagesQuery(queryInput);

  const rows = query.data?.pages ?? EMPTY_PAGES_ROWS;
  const totalCount = query.data?.totalCount ?? null;
  const hasNextPage = query.data?.hasMore ?? false;
  const isLoading = query.isFetching;
  const showTableLoading = isLoading && (showFilters || rows.length === 0);
  useDomainRenderDebug("PagesTab", {
    showFilters,
    isLoading,
    isPending: query.isPending,
    rows: rows.length,
    totalCount,
    activeTab: routeState.tab,
    page: routeState.page,
    sort: routeState.sort,
    order: routeState.order,
  });

  const applyFilters = useCallback(
    (values: PagesFilterValues) => {
      if (countPageFilterConditions(values) > maxConditions) return;
      const update = buildPagesSearchUpdate(values);
      debugDomain("PagesTab:apply-filters", { values, update });
      savePreferredFilters(values);
      setSearchParams(update);
    },
    [maxConditions, savePreferredFilters, setSearchParams],
  );

  const resetFilters = useCallback(() => {
    const update = buildPagesClearSearchUpdate();
    debugDomain("PagesTab:reset-filters", { update });
    clearPreferredFilters();
    setSearchParams(update);
  }, [clearPreferredFilters, setSearchParams]);

  const activeFilterCount = useMemo(
    () =>
      PAGE_FILTER_FIELDS.filter((k) => restoredFilters[k].trim() !== "").length,
    [restoredFilters],
  );

  const fileNamePrefix = target.replaceAll("/", "-");
  const {
    exporting,
    exportToSheets: handleExportToSheets,
    download: handleDownload,
  } = useDomainPagesExport({ input: queryInput, fileNamePrefix });

  const handleCopy = async () => {
    await navigator.clipboard.writeText(JSON.stringify(rows, null, 2));
    toast.success("Copied data");
  };

  return (
    <>
      {filtersOverBudget ? (
        <div className="alert alert-warning mb-3">
          <span>
            Saved filters exceed this scope&apos;s {maxConditions}-condition
            limit and were not applied. Open Filters to trim them.
          </span>
        </div>
      ) : null}

      <DomainTableTabSurface
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters((prev) => !prev)}
        activeFilterCount={activeFilterCount}
        countLabel="pages"
        totalCount={totalCount}
        fallbackCount={rows.length}
        isLoading={isLoading}
        showTableLoading={showTableLoading}
        exportActions={[
          {
            label: exporting ? "Exporting…" : "Export to Sheets",
            icon: <Sheet className="size-4" />,
            onClick: handleExportToSheets,
          },
          {
            label: "Copy data (JSON)",
            icon: <Copy className="size-4" />,
            onClick: handleCopy,
          },
          {
            label: exporting ? "Exporting…" : "Download CSV",
            icon: <Download className="size-4" />,
            onClick: () => handleDownload("csv"),
          },
          {
            label: exporting ? "Exporting…" : "Download Excel",
            icon: <FileSpreadsheet className="size-4" />,
            onClick: () => handleDownload("xls"),
          },
        ]}
        filterPanel={
          showFilters ? (
            <DomainFilterPanel
              debugName="PagesFilterPanel"
              activeFilterCount={activeFilterCount}
              appliedFilters={restoredFilters}
              fields={PAGE_FILTER_FIELDS}
              textFields={PAGE_TEXT_FILTERS}
              rangeFields={PAGE_RANGE_FILTERS}
              countConditions={countPageFilterConditions}
              maxConditions={maxConditions}
              onApply={applyFilters}
              onClear={resetFilters}
            />
          ) : null
        }
        pagination={
          <DomainKeywordsPagination
            page={routeState.page}
            pageSize={routeState.pageSize}
            totalCount={totalCount}
            hasNextPage={hasNextPage}
            isLoading={isLoading}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        }
      >
        <DomainPagesTable
          domain={hostname}
          rows={rows}
          sortMode={routeState.sort}
          currentSortOrder={routeState.order}
          onSortClick={onSortClick}
        />
      </DomainTableTabSurface>
    </>
  );
}
