# Universianity.com

A fast, SEO-ready student-guidance website that **publishes a new researched article with a cover image every day, automatically**.

## How it works

```
GitHub Actions (every day 02:30 UTC)
   └─ scripts/generate-post.mjs
        1. picks today's category (rotates through 7 topics)
        2. Claude researches a fresh topic with live web search
        3. Claude writes a 1,200–1,800 word article (+ title, SEO description, tags, links)
        4. every link is checked — only real, working source links are kept
        5. Cloudflare Workers AI (FLUX) creates a cover image (falls back to a branded SVG)
        6. commits the new post → Cloudflare Pages rebuilds and publishes universianity.com
```

**Site features:** homepage with featured post, paginated archive, 7 topic pages, instant search,
resource library of official links, related posts, share buttons, dark mode, mobile menu,
RSS feed, sitemap, robots.txt, Open Graph + JSON-LD structured data, ad slots, newsletter box,
About / Contact / Privacy / Disclaimer pages (needed for AdSense approval).

## One-time setup (about 30 minutes, all free tiers except the Claude API)

### 1. Put the code on GitHub
1. Create a free account at github.com and a new **private** repository called `universianity`.
2. Upload this folder's contents (GitHub web "Add file → Upload files" works, or GitHub Desktop).

### 2. Get API keys
| Key | Where | Cost |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | pay-as-you-go, roughly $0.10–0.30 per article |
| `CF_ACCOUNT_ID` | Cloudflare dashboard → right sidebar "Account ID" | free |
| `CF_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create → "Workers AI" template | free daily allowance covers 1 image/day |

In GitHub: **Settings → Secrets and variables → Actions → New repository secret** — add all three.

### 3. Host on Cloudflare Pages (free) and connect the domain
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → choose the repo.
2. Framework preset: **Astro**. Build command `npm run build`, output directory `dist`.
3. After the first deploy: **Custom domains → Set up a domain → universianity.com** (and `www`).
   If the domain is registered elsewhere, Cloudflare will tell you which nameservers to set at your registrar.

### 4. Turn on the daily robot
GitHub repo → **Actions** tab → enable workflows. To test immediately:
**Actions → Daily post → Run workflow** (tick *force* to publish even though today already has a post).

### 5. Personalise
Edit `src/site.config.mjs`: tagline, contact email, newsletter form URL, AdSense id (when approved).
Edit `src/data/resources.json` to add or change the resource library links.

## Running locally (optional)
Install Node.js 22 from nodejs.org, then:
```
npm install
npm run dev                # site at http://localhost:4321
set ANTHROPIC_API_KEY=...  # Windows (use export on macOS/Linux)
npm run generate           # write one post now
```

## Quality and Google — read this
Google does not penalise AI content itself, but it does penalise *mass-produced, low-value* pages
("scaled content abuse"). To stay safe and rank well:
- Spend 10 minutes a day reading the new post; fix or delete anything wrong (edit the `.md` file on GitHub).
- Add your own experience, photos and opinions to the best-performing posts.
- Keep one post a day — don't crank it up to dozens.
- Set up Google Search Console and submit `https://universianity.com/sitemap-index.xml`.

## Ways to make money
See the full list in the chat summary; the short version, in order of when to add them:
1. **Google AdSense** (apply after ~25–30 good posts and some traffic) → later upgrade to Ezoic/Mediavine/Raptive.
2. **Affiliate links**: online courses (Coursera, Udemy), test prep (IELTS/GRE/SAT), student laptops,
   student bank accounts / international money transfer, student housing, study-abroad insurance, VPNs.
3. **Email newsletter** → sponsors once you have a few thousand subscribers.
4. **Digital products**: scholarship essay templates, SOP/CV templates, deadline trackers, Notion study planners.
5. **Paid services**: SOP/essay review, application consulting, mock interviews (freelancers you partner with).
6. **Lead generation** for universities and study-abroad agencies (paid per qualified enquiry).
7. **Sponsored posts / featured listings** for courses, edtech tools and coaching centres (always labelled).
8. **Membership**: premium scholarship database with deadline alerts.
