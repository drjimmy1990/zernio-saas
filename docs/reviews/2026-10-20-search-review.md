# Asra3 search renewal review — 20 October 2026

Scope: local technical SEO, accurate public product copy, Arabic/English discovery pages and the owner handoff. No deployment, production SQL, Search Console/Bing change or IndexNow submission was performed.

## Evidence and fixes

- The owner supplied Google results for the former “SaaS & Automation Solutions” portfolio homepage and blog, plus an AI Overview repeating 18 platforms, 55+ countries, voice AI, eight ad networks and eight SDKs. These are owner-reported search results, not a complete Search Console export.
- Earlier live HTTP checks fetched obsolete metadata, sitemap and llms.txt content. The sitemap included login/signup/dashboard and query-string language alternatives that did not represent distinct translations. www served HTTP200 without redirecting to the apex.
- Later automated requests received Cloudflare403/error1010. That proves access was denied to this checker; access for Google/Bing requires owner inspection. The handoff covers Cloudflare rules and live URL inspection.
- Root metadata now describes the current manual product. The existing landing component is preserved behind a server metadata wrapper. Public pages have their own canonicals; the old homepage canonical no longer leaks to every route.
- Added five server-rendered product guides in each of Arabic and English: overview, CRM, WhatsApp, Facebook/Instagram and reports. Each pair has reciprocal hreflang, a matching self canonical, static HTML language/direction, visible language links, and actual text/FAQs. Unknown or untranslated paths return404.
- The sitemap contains twelve public URLs: homepage, documentation and ten guides. It excludes private surfaces and has no fabricated lastmod or ranking-priority fields.
- Login, signup, recovery, admin and dashboard have noindex metadata/headers. Authentication still protects workspaces. API responses have noindex headers; robots.txt blocks API crawling. Public UI routes remain crawlable so bots can see noindex when applicable.
- Replaced unsupported prices, platform totals, software features and global FAQ markup with accurate Organization/WebSite data and page-specific WebPage descriptions. JSON-LD is server-rendered and escapes HTML delimiters.
- Corrected footer certifications/service totals and phone previews that still implied browser calling, automatic SMS/MMS or live delivery. The documentation quickstart now uses read-only workspace/account requests. Corrected the manual Flows listing description, draft-mode wording and example key format; sample keys no longer imply full-access permissions.
- Added a PNG version of the existing logo for existing branding URLs. No company address, certifications, customer reviews, prices or ranking claims were invented.
- Updated llms.txt to link actual public guides and describe its optional role. One wildcard crawl policy prevents permissive AI-specific rules from overriding API restrictions. Existing public training access is not silently changed; the owner guide explains search versus training choices.
- Added permanent www→apex redirection preserving path/query. The proxy must preserve Host, and both hostnames require correct DNS/TLS.
- Prepared an IndexNow ownership file and a twelve-URL notification payload. It has not been submitted; live ownership and page checks must precede the documented command.
- The existing default404 handles the retired `/blog` and `/blog/tri-lingual-restaurant-os-kds` without irrelevant redirects. Three other supplied result URLs were truncated; the owner must copy their exact addresses into the URL worksheet.

## Review and validation

GitNexus upstream checks for edited SEO/layout/navigation functions and public copy components returned LOW impact. Root layout callers affect every page in practice, so validation includes rendered public/private routes and browser behavior. The complete uncommitted diff also contains the earlier business launch implementation: comparison with main returned critical scope (221 indexed changes,60 tracked files,146 affected processes). This does not mean the SEO changes alone touch those business flows. Untracked additions and relocated components are not fully represented by that diff-based count. No commit was made.

- Initial production build and TypeScript compilation passed.
- Initial SEO HTTP/browser suite:27 passed after correcting the test's Host-header transport.
- Existing integrated business/browser suite:5 passed, including CRM, viewer restrictions, administrator UI, Arabic mobile layout and public launch copy.
- Focused ESLint on the new SEO code, root wrapper and navigation:0 errors/warnings.
- Final source ZIP built successfully with Docker/Node24, including production TypeScript checks. The container ran as UID1000 with no copied environment files.
- Final expanded SEO suite against that container: **30 passed,0 failed**. Existing integrated business/browser suite after the final copy changes: **5 passed,0 failed**.
- ESLint on the four legacy documentation/showcase files:0 errors,27 existing unused/hook warnings. No broad lint refactor was performed.
- Git whitespace check passed. The ZIP matches all202 included source files; archive files explicitly use Unix0644 permissions for Ubuntu extraction. Private configuration values were checked without displaying them.

The local source snapshot used for the final Docker check was `release/asra3-deploy-2026-10-20-seo.zip`, SHA256 `dd4a768499cf2f654b0a3b2bcde37545551f2b83349830399a56eb358c360b76`. Final Docker tag: `asra3-seo-release:20261020`. These are historical local validation artifacts and are excluded from Git. The owner requested Git deployment; use the pushed `main` revision and [Git pull instructions](../../DEPLOYMENT-VPS.md#get-the-release-with-git). Local verification used dummy public build values; rebuild using the actual public Supabase configuration.

The expanded suite checks all twelve public pages, canonicals/hreflang, initial HTML, truthful metadata/schema, robots and sitemap, private noindex/auth redirects, retired URL404 responses, www308 behavior, IndexNow proof and Arabic/English mobile navigation. External requests are blocked in the browser fixture; tests do not send provider messages or indexing notifications.

## Owner handoff

Use [the search launch guide](../release/search-launch.md) and [old-URL worksheet](../release/old-search-urls.csv). Pull the Git release and rebuild with the owner's public deployment values. Application code and `.env` belong under `/opt/asra3`, outside aaPanel's public root. The earlier required SQL02–09 still precedes the full business launch; this SEO change introduces no new migration.

Google/Bing indexing, ranking and AI citations remain external outcomes. Legal/operator/support details need truthful owner-provided content. Further languages require actual reviewed translations and locale pages before adding hreflang or sitemap entries. The existing Google property/history must be preserved.
