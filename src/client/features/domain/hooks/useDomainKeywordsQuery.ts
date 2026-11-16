import { useQuery } from "@tanstack/react-query";
import { getDomainKeywordsPage } from "@/serverFunctions/domain";
import type { ResearchScope } from "@/shared/researchScope";
import type {
  DomainFilterValues,
  DomainSortMode,
  SortOrder,
} from "@/client/features/domain/types";

export type DomainKeywordsQueryInput = {
  projectId: string;
  domain: string;
  scope: ResearchScope;
  locationCode: number | undefined;
  page: number;
  pageSize: number;
  sortMode: DomainSortMode;
  sortOrder: SortOrder;
  appliedFilters: DomainFilterValues;
  enabled: boolean;
};

function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim();
  if (trimmed === "") return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toFiltersPayload(
  filters: DomainFilterValues,
): Record<string, unknown> {
  return {
    include: filters.include || undefined,
    exclude: filters.exclude || undefined,
    minTraffic: toNumberOrUndefined(filters.minTraffic),
    maxTraffic: toNumberOrUndefined(filters.maxTraffic),
    minVol: toNumberOrUndefined(filters.minVol),
    maxVol: toNumberOrUndefined(filters.maxVol),
    minCpc: toNumberOrUndefined(filters.minCpc),
    maxCpc: toNumberOrUndefined(filters.maxCpc),
    minKd: toNumberOrUndefined(filters.minKd),
    maxKd: toNumberOrUndefined(filters.maxKd),
    minRank: toNumberOrUndefined(filters.minRank),
    maxRank: toNumberOrUndefined(filters.maxRank),
  };
}

/**
 * The server payload for one keywords request. The export path sends this
 * same object (overriding only page/pageSize), so a table and its export can
 * never disagree about filters, scope or sort.
 */
export function domainKeywordsPayload(input: DomainKeywordsQueryInput) {
  return {
    projectId: input.projectId,
    domain: input.domain,
    scope: input.scope,
    locationCode: input.locationCode,
    page: input.page,
    pageSize: input.pageSize,
    sortMode: input.sortMode,
    sortOrder: input.sortOrder,
    filters: toFiltersPayload(input.appliedFilters),
  };
}

export function useDomainKeywordsQuery(input: DomainKeywordsQueryInput) {
  const payload = domainKeywordsPayload(input);
  return useQuery({
    enabled: input.enabled && Boolean(input.domain),
    queryKey: [
      "domain-keywords",
      input.projectId,
      input.domain,
      input.scope,
      input.locationCode,
      input.page,
      input.pageSize,
      input.sortMode,
      input.sortOrder,
      payload.filters,
    ],
    queryFn: () => getDomainKeywordsPage({ data: payload }),
    staleTime: 60_000,
  });
}
