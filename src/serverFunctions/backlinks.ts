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

// The web UI exposes spam score as a regular user filter, so the implicit
// DataForSEO spam-score cutoff stays off for all web requests.
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
    BacklinksService.profileBacklinksPage(data, context, WEB_SPAM_OPTIONS),
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

// Export variants walk every page behind a backlinks tab so CSV/Sheets get the
// whole filtered set, not just the page on screen. They reuse the same page
// services (and WEB_SPAM_OPTIONS) so an export can't diverge from the table.

export const exportBacklinksRows = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(backlinksRowsPageRequestSchema)
  .handler(({ data, context }) =>
    collectAllRows((page) =>
      BacklinksService.profileBacklinksPage(
        { ...data, page, pageSize: EXPORT_PAGE_SIZE },
        context,
        WEB_SPAM_OPTIONS,
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
