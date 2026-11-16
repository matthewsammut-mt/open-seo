import { useQuery } from "@tanstack/react-query";
import { getDomainPagesPage } from "@/serverFunctions/domain";
import { toPageSortMode } from "@/client/features/domain/utils";
import type { ResearchScope } from "@/shared/researchScope";
import type {
  DomainSortMode,
  PagesFilterValues,
  SortOrder,
} from "@/client/features/domain/types";

export type DomainPagesQueryInput = {
  projectId: string;
  domain: string;
  scope: ResearchScope;
  locationCode: number | undefined;
  page: number;
  pageSize: number;
  sortMode: DomainSortMode;
  sortOrder: SortOrder;
  appliedFilters: PagesFilterValues;
  enabled: boolean;
};

/**
 * The server payload for one pages request. The export path sends this same
 * object (overriding only page/pageSize), so a table and its export can never
 * disagree about filters, scope or sort.
 */
export function domainPagesPayload(input: DomainPagesQueryInput) {
  return {
    projectId: input.projectId,
    domain: input.domain,
    scope: input.scope,
    locationCode: input.locationCode,
    page: input.page,
    pageSize: input.pageSize,
    sortMode: toPageSortMode(input.sortMode),
    sortOrder: input.sortOrder,
    filters: input.appliedFilters,
  };
}

export function useDomainPagesQuery(input: DomainPagesQueryInput) {
  const pageSortMode = toPageSortMode(input.sortMode);
  const payload = domainPagesPayload(input);
  return useQuery({
    enabled: input.enabled && Boolean(input.domain),
    queryKey: [
      "domain-pages",
      input.projectId,
      input.domain,
      input.scope,
      input.locationCode,
      input.page,
      input.pageSize,
      pageSortMode,
      input.sortOrder,
      input.appliedFilters,
    ],
    queryFn: () => getDomainPagesPage({ data: payload }),
    staleTime: 60_000,
  });
}
