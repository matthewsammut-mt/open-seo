// The contract shared by the two email-gated Cloudflare Access boundaries —
// the persistent preview wildcard (alchemy.preview-access.run.ts) and the
// per-stage self-host gate (alchemy.run.ts). Worker naming, the
// WORKERS_SUBDOMAIN shape, the allowed-emails parsing, and the
// policy/application shape define who gets through which hostnames; keep them
// in one place so the two gates cannot drift. The one copy that can't import
// this module is the shell in .github/workflows/pr-preview.yml — its
// `open-seo-<stage>` naming stays comment-synced (and is backstopped by the
// workflow's Access verify step).

import * as Cloudflare from "alchemy/Cloudflare";
import * as Config from "effect/Config";
import * as Effect from "effect/Effect";

const WORKER_PREFIX = "open-seo";

// The one stage that adopts openseo.so's live hosted resources (unsuffixed
// names, app.openseo.so domain, Postgres). Deliberately not "prod" so a
// self-hoster's stage name can't collide with the adoption path.
export const HOSTED_PROD_STAGE = "hosted-prod";

export const workerName = (stage: string) =>
  stage === HOSTED_PROD_STAGE ? WORKER_PREFIX : `${WORKER_PREFIX}-${stage}`;

// Matches every preview worker hostname; production's unsuffixed worker does
// not match (Access allows one wildcard per dot-label).
export const previewWildcard = (subdomain: string) =>
  `${WORKER_PREFIX}-*.${subdomain}`;

export const readWorkersSubdomain = ({ required }: { required: boolean }) =>
  Effect.gen(function* () {
    const subdomain = (yield* Config.string("WORKERS_SUBDOMAIN").pipe(
      Config.withDefault(""),
    )).trim();
    if (subdomain.endsWith(".workers.dev") || (!subdomain && !required)) {
      return subdomain;
    }
    return yield* Effect.die(
      new Error(
        `Set WORKERS_SUBDOMAIN to the account's full workers.dev subdomain (shown under Workers & Pages)${required ? "." : ", or leave it unset."}`,
      ),
    );
  });

const readList = (name: string) =>
  Config.string(name).pipe(
    Config.withDefault(""),
    Config.map((raw) =>
      raw
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  );

/**
 * Reads ACCESS_ALLOWED_EMAILS and ACCESS_ALLOWED_EMAIL_DOMAINS; dies with
 * `remedy` when both are empty. Addresses and whole email domains (e.g.
 * `example.com`) are additive — a domain covers everyone who joins or leaves
 * without a redeploy, and individual addresses let someone outside it in.
 */
export const requireAllowedIdentities = (remedy: string) =>
  Effect.gen(function* () {
    const emails = yield* readList("ACCESS_ALLOWED_EMAILS");
    const emailDomains = yield* readList("ACCESS_ALLOWED_EMAIL_DOMAINS");
    if (emails.length === 0 && emailDomains.length === 0) {
      return yield* Effect.die(new Error(remedy));
    }
    return { emails, emailDomains };
  });

/** The gate itself: an email allow-policy on a self-hosted Access application. */
export const emailAccessGate = (options: {
  policyId: string;
  applicationId: string;
  policyName: string;
  applicationName: string;
  domain: string;
  /** A second hostname (a self-host's CUSTOM_DOMAIN) the same app protects. */
  extraDomain?: string;
  emails: string[];
  /** Whole email domains allowed through, alongside `emails`. */
  emailDomains?: string[];
  /** Turn on Access Managed OAuth so MCP clients can sign in. */
  managedOAuth?: boolean;
}) =>
  Effect.gen(function* () {
    const allow = yield* Cloudflare.Access.Policy(options.policyId, {
      name: options.policyName,
      decision: "allow",
      include: [
        ...options.emails.map((email) => ({ email: { email } })),
        ...(options.emailDomains ?? []).map((domain) => ({
          emailDomain: { domain },
        })),
      ],
    });
    return yield* Cloudflare.Access.Application(options.applicationId, {
      type: "self_hosted",
      name: options.applicationName,
      domain: options.domain,
      // One application (one `aud`) covers both hostnames. `domain` stays the
      // workers.dev hostname so an existing application updates in place.
      destinations: options.extraDomain
        ? [
            { type: "public", uri: options.domain },
            { type: "public", uri: options.extraDomain },
          ]
        : undefined,
      policies: [allow.policyId],
      // Lets CLI and desktop MCP clients register localhost callbacks.
      // Unset fields (HTTPS redirect URIs, token lifetimes) keep whatever is
      // set in the dashboard.
      oauthConfiguration: options.managedOAuth
        ? {
            enabled: true,
            dynamicClientRegistration: {
              enabled: true,
              allowAnyOnLocalhost: true,
              allowAnyOnLoopback: true,
            },
          }
        : undefined,
    });
  });
