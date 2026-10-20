# Search launch for asra3.com — owner checklist

This handoff covers publishing the renewed website and helping search engines discover its public pages. Google Search Console is already verified. The release is being prepared locally; deployment, Search Console/Bing changes, IndexNow submissions and production indexing have not been performed by this task. SEO introduces no additional SQL migration.

Domain registration renewal, deploying a new website, crawling, indexing and ranking are different operations. Renew the domain with its registrar if needed; that does not refresh Google. Deploying changes makes new content available. Crawling downloads it, indexing processes and stores it, and ranking determines which results appear for a particular search. Submission helps discovery; it cannot require Google/Bing to index every page, grant priority, show an AI citation or rank the site first. Google says recrawling can take days to weeks, and some changes take longer. Repeated indexing requests do not speed this up. [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl) · [How Google Search works](https://developers.google.com/search/docs/fundamentals/how-search-works)

## 1. Preserve the existing Search Console property and collect old URLs

Before replacing the live website:

1. Open [Google Search Console](https://search.google.com/search-console) using the verified owner account. Keep the existing property and its history. A Domain property for `asra3.com` covers protocols and subdomains; a URL-prefix property covers its specified prefix. If verification uses DNS, preserve the exact verification TXT record when changing DNS. If it uses a file or meta tag, preserve that token in the deployed site. Do not delete the property to start over. [Ownership verification](https://support.google.com/webmasters/answer/9008080)
2. Check **Security & Manual Actions → Security issues** and **Manual actions**. Check **Removals** for past requests, especially an accidental site-wide/prefix removal. Resolve actual reported issues; a redesign or submission does not erase them. Retain records of any action and reconsideration outcome.
3. Export **Performance → Search results → Pages** over a useful historical period and the available **Page indexing** examples. Save the old sitemap, important external links and existing server-access URL history if available. A `site:asra3.com` search is a supplementary spot check, not a complete indexed-page inventory.
4. Build an explicit old-URL disposition list: old URL, current purpose, relevant new destination or removal, and expected HTTP status. Prioritize old URLs with traffic/backlinks and those whose old title/content still appears in Google.

For an updated page at the same URL, retain that URL and request recrawling after deployment. For content moved to a genuinely corresponding page, use a direct permanent **301 or 308** redirect. For content removed without an equivalent, return an actual **404 or 410**. Avoid redirecting every old URL to the homepage, long redirect chains, or returning a branded error page with HTTP200; irrelevant redirects can be treated as soft404s. Keep useful permanent redirects for at least a year, preferably longer for visitors. Update internal links and important profile/backlink destinations. [Google URL-move guidance](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)

**Change of Address** is for a domain/subdomain move; this same-domain renewal does not need it. **Removals** is for urgent temporary suppression, not refreshing the website or choosing its canonical version. Do not submit a blanket removal of `https://asra3.com/`. Old removed URLs normally disappear as Google recrawls their404/410 responses. [Removals guidance](https://support.google.com/webmasters/answer/9689846)

### The old results supplied by the owner

The old homepage title was **“SaaS & Automation Solutions - asra3.com”** and described a personal SaaS/automation portfolio. Keep `https://asra3.com/`, deploy the current product content, and request recrawling of that same URL. The old `/blog` and `/blog/tri-lingual-restaurant-os-kds` have no corresponding product pages and should return HTTP404 in this release. The default application already handles them that way; ensure the proxy/CDN does not serve the old blog instead. See [the initial URL worksheet](old-search-urls.csv).

The other three pasted blog addresses were truncated by the search-result display. In Search Console or Google, copy the actual link address for “How I Built asra3.com”, “The Hidden ROI of Building Custom Admin Dashboards” and “AI-Powered CV Optimization in Recruitment SaaS”, then add their exact URLs to the worksheet. Do not invent slugs or redirect those unrelated articles to the new product guides. If an old article should be retained, restore its genuine content at a deliberate URL and map it before requesting indexing.

The supplied AI Overview repeats 18 platforms, 55+ countries, AI voice, eight ad networks and eight SDKs. These claims were also present in the earlier site's metadata/content. The reviewed release corrects the current product description and removes unsupported offers/claims. An AI summary may still lag after deployment; there is no direct edit of Google's answer from the application. Recheck its cited sources after recrawling and use Google's feedback control for a specific misleading answer when appropriate.

## 2. Deploy and check the real public website first — Ubuntu/aaPanel

Follow [the reviewed VPS deployment handoff](../../DEPLOYMENT-VPS.md), including its application/database requirements. Use the approved release at `/opt/asra3`, outside aaPanel's public website root, with real `NEXT_PUBLIC_APP_URL=https://asra3.com` and public build values, then rebuild and start the application. Complete local release checks before the owner deployment. Do not submit development, localhost or an old still-running site as the renewed website.

In aaPanel:

1. Confirm DNS for `asra3.com` points to the intended VPS. Preserve mail records and verification records. Check any `AAAA` record also reaches the correct server; a stale IPv6 destination can serve a different site.
2. Use a valid HTTPS certificate for the apex and `www.asra3.com` if www resolves. Set the reverse proxy to the configured loopback app port, normally `http://127.0.0.1:3008`, preserving the original Host and forwarded protocol headers. The released application must receive the www Host for its canonical redirect, or use a dedicated aaPanel/Nginx permanent host redirect that preserves the path/query. Do not leave the old aaPanel static site serving some host variants.
3. Verify HTTP and www variants reach the same canonical `https://asra3.com` destination. The earlier live www host served a separate200 response; the local release includes a permanent www→apex correction, which still requires deployment and correct proxy/DNS/certificate setup. Do not use a temporary302 for this permanent host decision or configure a redirect loop.
4. If aaPanel, Nginx or a CDN caches old HTML, clear the affected cache after release. Confirm an incognito request sees the current brand, content and metadata; clearing a server/CDN cache does not clear Google's index.
5. Confirm public pages, sitemap and robots.txt are reachable without login, CAPTCHA or a WAF challenge. Review crawler logs and use the search engines' live inspection tools to check their actual access. Do not disable authentication/security on private paths to admit a bot.

**Observed access limitation:** a later automated live check on 20 October 2026 received Cloudflare HTTP403 / error1010 for the homepage and old blog URLs. Earlier checks successfully fetched the current public HTML. This establishes that this checker was blocked, not that Googlebot is necessarily blocked. In Cloudflare, inspect the corresponding Security events and bot/WAF settings, then confirm access using Google/Bing live inspection. Ensure any managed robots.txt/AI-crawler controls agree with the intended public search policy. Allow verified desired crawlers using official identity/IP verification where appropriate; do not remove general protection or trust arbitrary User-Agent strings.

[Cloudflare's error1010 explanation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/) identifies a browser-signature block. Review Browser Integrity Check and relevant rules, rather than assuming the application generated this response.

Owner checks after deployment (read-only requests):

```bash
curl --fail --silent --show-error https://asra3.com/sitemap.xml
curl --fail --silent --show-error https://asra3.com/robots.txt
curl -I https://www.asra3.com/ar/whatsapp
curl -I http://asra3.com/en/crm
curl -IL https://www.asra3.com/ar/whatsapp
curl --fail --silent --show-error https://asra3.com/ar/whatsapp >/dev/null
curl --fail --silent --show-error https://asra3.com/en/whatsapp >/dev/null
```

Expect permanent host/protocol redirects followed by a200 public page, with path preserved. Check an old URL from the inventory against its chosen301/308 or404/410 behavior. Use a browser or Search Console live rendered HTML to check titles, descriptions, canonical tags, language annotations and visible content; successful curl status alone does not establish correct SEO or indexing.

## 3. Submit the intended public pages, with Arabic and English first

The local launch inventory below must be checked on the deployed release. `/` remains the main rich homepage; `/ar` and `/en` are product guides. They are separate useful pages, not duplicate copies pretending to be translations of the root.

| Public content | Arabic | English / shared |
| --- | --- | --- |
| Main homepage | — | `https://asra3.com/` |
| Developer documentation | — | `https://asra3.com/docs` |
| Product guide | `https://asra3.com/ar` | `https://asra3.com/en` |
| CRM guide | `https://asra3.com/ar/crm` | `https://asra3.com/en/crm` |
| WhatsApp guide | `https://asra3.com/ar/whatsapp` | `https://asra3.com/en/whatsapp` |
| Facebook/Instagram guide | `https://asra3.com/ar/facebook-instagram` | `https://asra3.com/en/facebook-instagram` |
| Reports guide | `https://asra3.com/ar/reports` | `https://asra3.com/en/reports` |

Include these canonical public200 URLs in `https://asra3.com/sitemap.xml`. Exclude dashboard, login, signup, administration, customer records, session/API routes, redirect destinations listed under their old URLs, preview/staging pages and placeholders. “All public pages” means all useful pages intended for search, not every publicly callable URL. Newly added genuine public pages should join the sitemap after review.

Verify each Arabic/English guide has its own canonical URL and reciprocal hreflang links to its actual translated equivalent, with appropriate HTML language/direction and visible internal language-switch links. Avoid declaring every guide canonical to `/` or using hreflang to pair unrelated content. Keep important information in visible text and link all guides from navigable public pages. Use accurate per-page lastmod when significant content changes; do not stamp every sitemap generation as a new content update. Google ignores sitemap priority/changefreq; those fields cannot buy faster indexing. [Sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)

Private pages require authentication and appropriate noindex controls. robots.txt alone is neither access control nor a guaranteed removal from results. A crawler must be able to fetch a publicly accessible noindex page to see that directive; robots.txt blocking can prevent that. Do not expose private content for indexing. [Google noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing)

For more languages later, select regions from customer needs and measured search demand, translate the actual product/support content, review claims with a fluent speaker, and publish complete useful pages. Add self canonicals, mutual hreflang and sitemap entries only when ready. Use regional language codes only for genuinely region-specific pages. Offer a voluntary language selector; do not force visitors or bots to a language through IP-based geography redirects. Additional languages are staged future work, not part of this verified launch inventory. [Google multilingual and regional guidance](https://developers.google.com/search/docs/specialty/international/managing-multi-regional-sites)

## 4. Google Search Console — immediate owner actions after deployment

1. Select the existing asra3.com property. Under **Sitemaps**, submit `https://asra3.com/sitemap.xml` (or `sitemap.xml` in the matching URL-prefix property). Check fetch/processing success and discovered URL count. Retire obsolete sitemap references only after preserving their URL inventory.
2. In **URL Inspection**, inspect `https://asra3.com/`, then `/ar`, `/en`, `/docs` and the most important updated service guides. Click **Test live URL**; verify Google can fetch/render the renewed content and that indexing is allowed. Inspect the returned HTML/screenshot when available.
3. If the live result is correct, click **Request indexing** for those priority pages. This is the owner's chosen work order, not a Google priority guarantee. Use the sitemap for the whole public inventory rather than repeatedly submitting every URL.
4. Inspect some important old URLs to confirm their redirect/removal outcome. Review **Page indexing** for unexpected noindex, robots blocks, server errors, soft404s and duplicate/canonical issues. Intentional private exclusions and old redirected/removed pages are not failures that need blanket indexing requests.
5. In **Settings → Search generative AI**, confirm the domain/property is set to **Include my site's links and content in Search generative AI features**, or inherits an included parent. Google says Include is the default; an earlier owner/parent override can exclude it. This setting controls eligibility for AI Overviews, AI Mode and generative Discover features and is separate from ordinary search ranking and AI training preferences. [Current Search generative AI control](https://support.google.com/webmasters/answer/16908024)
6. Recheck indexing/canonical results over the following days/weeks. Record each key URL's last crawl, indexed status, Google-selected canonical and any actionable exclusion reason. Compare Search performance over meaningful periods rather than treating one personalized `site:` search or one day of impressions as proof of success.

Use the standard **Performance → Search results** report for clicks, impressions, queries and pages. The current **Generative AI performance report** shows impressions for supported Google Search AI features and may not appear until the property has enough impressions. It is a measurement tool, not a ranking or submission switch. [Current AI performance report](https://support.google.com/webmasters/answer/16984139)

Google's Indexing API is limited to qualifying JobPosting or livestream BroadcastEvent-in-VideoObject pages. It is not an all-pages indexing API for this SaaS website. [Indexing API scope](https://developers.google.com/search/apis/indexing-api/v3/quickstart)

## 5. Bing and other relevant search discovery

1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters). Import the already verified asra3.com property from Google Search Console, reviewing the account permissions requested, or verify it through Bing's offered DNS/file/meta method. Preserve its verification token during future deployments. [Official Bing setup](https://blogs.bing.com/webmaster/2025/6/Start-Using-Bing-Webmaster-Tools-to-Improve-Your-Site-Visibility/)
2. Under **Sitemaps**, submit `https://asra3.com/sitemap.xml`. Review success, last-read date and processing errors. Include the same sitemap URL in robots.txt for discovery. Use Bing **URL Inspection**, **Site Explorer**, **Site Scan** and **Search Performance** to identify old URLs, blocked pages, canonical/metadata issues and actual visibility.
3. Consider **IndexNow** after deployment. If the CDN already provides it, verify that configuration rather than duplicating submissions. Otherwise implement the official key-file verification and reviewed notifications separately: publish a generated UTF-8 key file on the same host, verify it is reachable, and notify a participating endpoint when a public URL is added, materially updated or removed. For this release, a reviewed initial set can cover the new/updated public inventory and retired URLs; ongoing notifications should track real changes rather than resubmitting the whole site on every request.
4. IndexNow accepts up to10,000 URLs per POST and shares submissions across participating engines. HTTP200 means receipt, not guaranteed crawling/indexing/ranking;202 can mean key validation pending. Google is not listed as a participating endpoint, so keep Google's sitemap/URL Inspection process. Do not send signed/private/customer URLs. [IndexNow protocol](https://www.indexnow.org/documentation) · [Current endpoints and FAQ](https://www.indexnow.org/faq)
5. Bing recommends complete sitemaps plus IndexNow freshness notifications; both support discovery for Bing and AI search experiences such as Copilot. Its AI Performance tools can show citation activity when available, which is different from indexed-page counts or ranking. [Bing sitemap guidance](https://blogs.bing.com/webmaster/2025/7/Keeping-Content-Discoverable-with-Sitemaps-in-AI-Powered-Search/) · [Bing AI Performance](https://blogs.bing.com/webmaster/2026/2/Introducing-AI-Performance-in-Bing-Webmaster-Tools-Public-Preview/)

Bing is relevant to several search/AI discovery surfaces, but it does not certify universal inclusion in every assistant. There is no single “submit to all search engines and AI models” action. Prioritize Google and Bing for the initial Arabic/English audience; evaluate additional region-specific engines when actual expansion plans justify their own verification and policies.

### Prepared IndexNow files — submit only after deployment

This release includes an ownership verification text file under `public/` and a reviewed twelve-URL payload at `scripts/seo/indexnow-submission.json`. No notification has been submitted. Keep the ownership file reachable in later deployments. This protocol proof is served publicly by design; it is not your Zernio or payment credential. Do not publish the payload in a support conversation.

After deploying, reviewing the live sitemap and checking the URLs, run on the Ubuntu VPS:

If `jq` is not installed, install the JSON utility first with `sudo apt-get update`, then `sudo apt-get install -y jq`.

```bash
(
set -eu
cd /opt/asra3
# Install jq through your normal server package management if it is absent.
jq -r '.urlList[]' scripts/seo/indexnow-submission.json
KEY_URL=$(jq -r '.keyLocation' scripts/seo/indexnow-submission.json)
EXPECTED_KEY=$(jq -r '.key' scripts/seo/indexnow-submission.json)
LIVE_KEY=$(curl --fail --silent --show-error "$KEY_URL")
test "$LIVE_KEY" = "$EXPECTED_KEY"
# Continue only if the test above succeeds and all twelve public URLs are correct.
curl --silent --show-error --fail-with-body \
  -H 'Content-Type: application/json; charset=utf-8' \
  --data-binary @scripts/seo/indexnow-submission.json \
  -w '\nHTTP %{http_code}\n' \
  https://api.indexnow.org/indexnow
)
```

HTTP200 acknowledges receipt;202 means validation is pending. Neither proves inclusion. For403, check that the deployed file matches the key and is not blocked; for422, check host/URL ownership; for429, stop repeated submissions and retry later. Review future payloads when public content actually changes. This initial payload does not include private paths or the truncated legacy URLs. Removed URLs may be notified separately after their exact addresses and live404/410 behavior are confirmed. Google still needs its own sitemap/URL Inspection steps.

## 6. AI visibility and crawler choices

Search visibility and model training are distinct. Publish useful, accurate public content, real examples, supported feature limitations, clear explanations, consistent branding and evidence for claims. Keep mobile/RTL pages usable and important content available as text. Structured data must match what visitors can actually read. Google says its AI search features use ordinary SEO foundations; no special schema or AI text file is required. `llms.txt` may be a convenience for tools that use it, but Google explicitly says it neither helps nor harms Google visibility/ranking because Google Search ignores it. Avoid promises that it ensures AI recommendations, artificial reviews/mentions, fabricated statistics or mass pages created to manipulate responses. [Current Google AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)

| Crawler/control | Purpose and owner choice |
| --- | --- |
| Googlebot | Google Search crawling, including its Search features. Allow the intended public pages and required rendering assets. |
| Search Console Search generative AI setting | Current site inclusion choice for Google's Search AI features. Confirm Include/inheritance as described above; this is not a training setting. |
| Google-Extended | Separate Google AI training/grounding product preference. Google says it does not affect inclusion or ranking in ordinary Google Search. Decide deliberately; it is not necessary to permit it just to refresh search results. [Official crawler list](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers) |
| OAI-SearchBot | ChatGPT search discovery. Official OpenAI documentation recommends allowing it and its published IP ranges for search visibility. This is independent of GPTBot. |
| GPTBot | Content that may be used for OpenAI foundation-model training. Allow or disallow according to the owner's training policy; allowing training is not a guaranteed recommendation/indexing mechanism. |
| ChatGPT-User | User-initiated page access, not automatic search crawling. OpenAI says robots.txt rules may not apply to these user requests and this agent does not decide Search inclusion. [Official OpenAI bots](https://developers.openai.com/api/docs/bots) |
| PerplexityBot | Perplexity search discovery; its documentation says it is not a foundation-model training crawler. Perplexity-User is user-requested access and generally ignores robots.txt. [Official Perplexity crawlers](https://docs.perplexity.ai/docs/resources/perplexity-crawlers) |
| Claude-SearchBot / Claude-User | Anthropic search discovery / user-requested access. ClaudeBot is its separate potential training crawler. Anthropic documents robots.txt preferences separately for each. [Official Anthropic crawler guidance](https://privacy.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) |

When adding a specific robots.txt bot group, review its entire rule set: a more specific group can override the wildcard group's rules. Preserve private-path exclusions rather than accidentally adding an unrestricted Allow group. Keep authentication as the real privacy boundary. If a WAF blocks desired public search crawlers, use official identity verification/IP ranges where provided, not a blanket trust of a spoofable User-Agent string. Do not disable the site's WAF for all traffic.

## 7. Genuine business identity and follow-up

Keep an accurate About/contact/support identity and any legal/privacy/terms information required for the actual service and jurisdictions. The owner must provide real operator details, support channels, policies, pricing and limitations; this checklist does not invent an address, company registration, legal text or customer testimonials. Keep public product guides aligned with supported features and Coming soon disclosures. Maintain genuine external business profiles and earned references, using the current canonical URL. Create Google Business Profile/Bing Places entries only if the business is actually eligible and its details are truthful; a purely online SaaS should not invent a storefront.

Keep a simple owner log containing deployment date/revision, sitemap submission outcomes, the old-URL disposition list, key URL inspection results, crawl/indexing errors and changes made. Review after the first week, then over the following weeks as data accumulates. Track indexed canonical public pages, Arabic/English queries, impressions/clicks, conversions where properly configured, crawler failures and AI impressions/citations where the engines provide them. Investigate specific failures rather than repeating submissions or purchasing supposed indexing priority. Further languages need complete reviewed translations; the prepared IndexNow notification still needs live verification and owner submission.

Completion means the reviewed release is deployed, public URLs and redirects pass live inspection, the owner has submitted the sitemap and checked the verified search properties, and the monitoring log is maintained. It does not mean every page is indexed or the site is guaranteed to rank or be recommended by AI. Production search outcomes remain pending owner deployment and search-engine processing.
