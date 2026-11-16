import { createServerFn } from "@tanstack/react-start";
import { requireProjectContext } from "@/serverFunctions/middleware";
import {
  domainOverviewSchema,
  domainKeywordSuggestionsSchema,
  domainKeywordsPageRequestSchema,
  domainPagesPageRequestSchema,
} from "@/types/schemas/domain";
import { DomainService } from "@/server/features/domain/services/DomainService";
import { collectAllRows, EXPORT_PAGE_SIZE } from "@/server/lib/exportAllRows";
import { recordResearchStep } from "@/server/features/activation/researchActivation";
import { resolveLabsMarket } from "@/shared/keyword-locations";

function shouldUseDomainE2eFixtures() {
  return import.meta.env.VITE_E2E_DOMAIN_FIXTURES === "1";
}

async function getDomainE2eFixtures() {
  return import("../../tests/fixtures/domain-overview-fixtures");
}

export const getDomainOverview = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainOverviewSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveLabsMarket(data, context.project),
      projectId: context.projectId,
    };
    if (shouldUseDomainE2eFixtures()) {
      const fixtures = await getDomainE2eFixtures();
      return fixtures.getFixtureOverview(input.domain);
    }

    const overview = await DomainService.getOverview(input, context);
    await recordResearchStep(context.projectId, "competitor");
    return overview;
  });

export const getDomainKeywordSuggestions = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainKeywordSuggestionsSchema)
  .handler(async ({ data, context }) =>
    DomainService.getSuggestedKeywords(
      {
        ...data,
        ...resolveLabsMarket(data, context.project),
        organizationId: context.organizationId,
        projectId: context.projectId,
      },
      context,
    ),
  );

export const getDomainKeywordsPage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainKeywordsPageRequestSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveLabsMarket(data, context.project),
      projectId: context.projectId,
    };
    if (shouldUseDomainE2eFixtures()) {
      const fixtures = await getDomainE2eFixtures();
      return fixtures.getFixtureKeywordsPage(input);
    }

    return DomainService.getKeywordsPage(input, context);
  });

export const getDomainPagesPage = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainPagesPageRequestSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveLabsMarket(data, context.project),
      projectId: context.projectId,
    };
    if (shouldUseDomainE2eFixtures()) {
      const fixtures = await getDomainE2eFixtures();
      return fixtures.getFixturePagesPage(input);
    }

    return DomainService.getPagesPage(input, context);
  });

/**
 * Export variants of the two table endpoints: same validated input, same
 * service, but every matching row rather than the visible page. They reuse the
 * page schemas so a filter the table supports can never be one the export
 * silently drops — `page` and `pageSize` are the only fields overridden.
 */
export const exportDomainKeywords = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainKeywordsPageRequestSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveLabsMarket(data, context.project),
      projectId: context.projectId,
    };
    const { rows, totalCount, truncated } = await collectAllRows(
      async (page) => {
        const result = await DomainService.getKeywordsPage(
          { ...input, page, pageSize: EXPORT_PAGE_SIZE },
          context,
        );
        return {
          rows: result.keywords,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        };
      },
    );
    return { keywords: rows, totalCount, truncated };
  });

export const exportDomainPages = createServerFn({ method: "POST" })
  .middleware(requireProjectContext)
  .validator(domainPagesPageRequestSchema)
  .handler(async ({ data, context }) => {
    const input = {
      ...data,
      ...resolveLabsMarket(data, context.project),
      projectId: context.projectId,
    };
    const { rows, totalCount, truncated } = await collectAllRows(
      async (page) => {
        const result = await DomainService.getPagesPage(
          { ...input, page, pageSize: EXPORT_PAGE_SIZE },
          context,
        );
        return {
          rows: result.pages,
          hasMore: result.hasMore,
          totalCount: result.totalCount,
        };
      },
    );
    return { pages: rows, totalCount, truncated };
  });
