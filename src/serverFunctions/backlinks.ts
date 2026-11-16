import { createServerFn } from "@tanstack/react-start";
import { BacklinksService } from "@/server/features/backlinks/services/BacklinksService";
import { requireProjectContext } from "@/serverFunctions/middleware";
import { collectAllRows, EXPORT_PAGE_SIZE } from "@/server/lib/exportAllRows";
import {
  backlinksOverviewInputSchema,
  backlinksRowsPageRequestSchema,
  referringDomainsPageRequestSchema,
  topPagesPageRequestSchema,
} from "@/types/schemas/backlinks";

// Referring-domain scores aggregate multiple links and retain their own filters.
const WEB_SPAM_OPTIONS = { hideSpam: false };

export const getBacklinksOverview = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(backlinksOverviewInputSchema)
  .handler(async ({ data, context }) => {
    const profile = await BacklinksService.profileOverview(
      {
        target: data.target,
        scope: data.scope,
      },
      context,
    );
    return profile.overview;
  });

export const getBacklinksRows = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(backlinksRowsPageRequestSchema)
  .handler(({ data, context }) =>
    BacklinksService.profileBacklinksPage(data, context, {
      hideSpam: data.hideSpam ?? true,
    }),
  );

export const getBacklinksReferringDomains = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(referringDomainsPageRequestSchema)
  .handler(({ data, context }) =>
    BacklinksService.profileReferringDomainsPage(
      data,
      context,
      WEB_SPAM_OPTIONS,
    ),
  );

export const getBacklinksTopPages = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(topPagesPageRequestSchema)
  .handler(({ data, context }) =>
    BacklinksService.profileTopPagesPage(data, context),
  );

/**
 * Export variants of the three backlinks tables: same validated input and
 * service as the page endpoints above, but every matching row instead of the
 * visible page. Reusing the page schemas keeps each export's filters, scope
 * and sort identical to the table it came from.
 */
export const exportBacklinksRows = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(backlinksRowsPageRequestSchema)
  .handler(({ data, context }) =>
    collectAllRows((page) =>
      BacklinksService.profileBacklinksPage(
        { ...data, page, pageSize: EXPORT_PAGE_SIZE },
        context,
        { hideSpam: data.hideSpam ?? true },
      ),
    ),
  );

export const exportBacklinksReferringDomains = createServerFn({
  method: "POST",
})
  .middleware(requireProjectContext)
  .validator(referringDomainsPageRequestSchema)
  .handler(({ data, context }) =>
    collectAllRows((page) =>
      BacklinksService.profileReferringDomainsPage(
        { ...data, page, pageSize: EXPORT_PAGE_SIZE },
        context,
        WEB_SPAM_OPTIONS,
      ),
    ),
  );

export const exportBacklinksTopPages = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(topPagesPageRequestSchema)
  .handler(({ data, context }) =>
    collectAllRows((page) =>
      BacklinksService.profileTopPagesPage(
        { ...data, page, pageSize: EXPORT_PAGE_SIZE },
        context,
      ),
    ),
  );
