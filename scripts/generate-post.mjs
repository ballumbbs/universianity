// Generates one new blog post: researches a fresh topic with web search,
// writes the article, checks its links and creates a cover image.
//
// Env:
//   ANTHROPIC_API_KEY   required
//   CF_ACCOUNT_ID       optional  Cloudflare account id, for AI cover images
//   CF_API_TOKEN        optional  Cloudflare API token with Workers AI permission
//   CATEGORY            optional  force a category slug (default: rotates daily)
//   TOPIC               optional  force a topic idea
//   FORCE=1             optional  publish even if a post already exists for today
//   CLAUDE_MODEL        optional  default claude-opus-5-5

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SITE, CATEGORIES, categoryBySlug } from "../src/site.config.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BLOG_DIR = path.join(ROOT, "src/content/blog");
const IMG_DIR = path.join(ROOT, "public/images/posts");
const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const today = new Date().toISOString().slice(0, 10);

const client = new Anthropic();

// ---------- existing posts ----------

async function loadExisting() {
  await fs.mkdir(BLOG_DIR, { recursive: true });
  const files = (await fs.readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));
  const posts = [];
  for (const f of files) {
    const text = await fs.readFile(path.join(BLOG_DIR, f), "utf8");
    const title = text.match(/^title:\s*(.+)$/m)?.[1]?.replace(/^"|"$/g, "") ?? "";
    const date = text.match(/^pubDate:\s*"?(\d{4}-\d{2}-\d{2})/m)?.[1] ?? "";
    posts.push({ slug: f.replace(/\.md$/, ""), title, date });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date));
}

function pickCategory() {
  if (process.env.CATEGORY) {
    const c = categoryBySlug(process.env.CATEGORY);
    if (!c) throw new Error(`Unknown CATEGORY "${process.env.CATEGORY}"`);
    return c;
  }
  const dayNumber = Math.floor(Date.parse(today) / 86_400_000);
  return CATEGORIES[dayNumber % CATEGORIES.length];
}

// ---------- step 1: research with web search ----------

async function research(category, recentTitles) {
  const prompt = `You are the research editor for ${SITE.name} (${SITE.url}), a website for students and future students worldwide.

Today is ${today}. Category: "${category.name}" — ${category.blurb}
${process.env.TOPIC ? `Requested topic: ${process.env.TOPIC}` : ""}

Recently published titles (do NOT repeat or closely overlap these):
${recentTitles.map((t) => `- ${t}`).join("\n") || "- (none yet)"}

1. Choose ONE specific, genuinely useful topic for today's article in this category. Prefer things students are searching for right now (upcoming deadlines, new rules, seasonal needs) or evergreen "how to" questions with clear search demand. Be specific (e.g. "How to write a Chevening leadership essay" beats "Scholarship tips").
2. Use web search to gather accurate, current facts. Prefer official sources (universities, governments, scholarship bodies, test providers).
3. Reply with research notes: the chosen topic, the target reader, the key facts (with dates, amounts and eligibility where relevant), and a list of the best source URLs with one line on what each contains. Only list URLs you actually saw in search results.`;

  const messages = [{ role: "user", content: prompt }];
  const sources = new Map();
  let notes = "";

  for (let turn = 0; turn < 6; turn++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      output_config: { effort: "medium" },
      tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 8 }],
      messages,
    });
    if (response.stop_reason === "refusal") throw new Error("Research request was declined by the model.");

    for (const block of response.content) {
      if (block.type === "text") notes += block.text;
      if (block.type === "web_search_tool_result" && Array.isArray(block.content)) {
        for (const r of block.content) if (r.url) sources.set(r.url, r.title || r.url);
      }
    }
    if (response.stop_reason !== "pause_turn") break;
    messages.push({ role: "assistant", content: response.content });
  }

  if (!notes.trim()) throw new Error("Research step returned no notes.");
  return { notes, sources };
}

// ---------- step 2: write the article (structured output) ----------

const ARTICLE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "slug", "description", "tags", "body_markdown", "links", "image_prompt", "image_alt"],
  properties: {
    title: { type: "string", description: "SEO-friendly headline, 50-70 characters." },
    slug: { type: "string", description: "URL slug: lowercase words joined by hyphens, max 8 words." },
    description: { type: "string", description: "Meta description, 140-160 characters." },
    tags: { type: "array", items: { type: "string" }, description: "3-6 short lowercase tags." },
    body_markdown: { type: "string", description: "The full article in Markdown, without the H1 title." },
    links: {
      type: "array",
      description: "4-8 useful links for the reader, chosen only from the provided source list.",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "note"],
        properties: { title: { type: "string" }, url: { type: "string" }, note: { type: "string" } },
      },
    },
    image_prompt: {
      type: "string",
      description:
        "Prompt for an AI image model: a photographic or editorial-illustration cover image for the article. No text, letters, logos or real people's faces.",
    },
    image_alt: { type: "string", description: "Alt text describing the cover image." },
  },
};

async function writeArticle(category, notes, sources) {
  const sourceList = [...sources].map(([url, title]) => `- ${title}: ${url}`).join("\n");
  const prompt = `Write today's article for ${SITE.name}, category "${category.name}".

RESEARCH NOTES:
${notes}

SOURCE URLS YOU MAY LINK TO (use only these, copied exactly):
${sourceList}

Editorial standards:
- Write for a smart 17-25 year old student anywhere in the world. Clear, warm, direct; no hype, no filler intros.
- 1,200-1,800 words. Use H2/H3 headings, short paragraphs, numbered steps, bullet lists and a comparison table where it helps.
- Be concrete: real names, dates, amounts, eligibility, step-by-step actions. If a fact may change, say "check the official page".
- Never invent statistics, deadlines or quotes. If the notes don't support a fact, leave it out.
- Inline links are allowed only to the source URLs above.
- End with a "## Quick FAQ" section (3-5 questions) and a one-paragraph "## Next steps".
- Do not include the title as an H1 and do not mention that you are an AI.`;

  const stream = client.messages.stream({
    model: MODEL,
    max_tokens: 32000,
    output_config: { effort: "medium", format: { type: "json_schema", schema: ARTICLE_SCHEMA } },
    messages: [{ role: "user", content: prompt }],
  });
  const message = await stream.finalMessage();
  if (message.stop_reason === "refusal") throw new Error("Writing request was declined by the model.");
  if (message.stop_reason === "max_tokens") throw new Error("Article was cut off (max_tokens).");

  const text = message.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  return JSON.parse(text);
}

// ---------- step 3: keep only real, working links ----------

async function linkWorks(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(12_000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; UniversianityLinkCheck/1.0)" },
    });
    // Many official sites block bots with 403 but work fine in a browser.
    return res.ok || res.status === 403;
  } catch {
    return false;
  }
}

async function cleanLinks(links, sources) {
  const seen = new Set();
  const out = [];
  for (const l of links) {
    if (seen.has(l.url) || !sources.has(l.url)) continue;
    seen.add(l.url);
    if (await linkWorks(l.url)) out.push(l);
  }
  return out.slice(0, 8);
}

// ---------- step 4: cover image ----------

async function aiImage(prompt) {
  const { CF_ACCOUNT_ID, CF_API_TOKEN } = process.env;
  if (!CF_ACCOUNT_ID || !CF_API_TOKEN) return null;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${CF_API_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `${prompt}. Wide 16:9 editorial cover photo, natural light, high detail, no text, no watermark.`,
        steps: 8,
      }),
    },
  );
  if (!res.ok) {
    console.warn(`Image generation failed (${res.status}); using fallback cover.`);
    return null;
  }
  const json = await res.json();
  return json?.result?.image ? Buffer.from(json.result.image, "base64") : null;
}

const xml = (s) => s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]);

/** Branded typographic cover used when no image API is configured. */
function fallbackCover(title, categoryName) {
  const palettes = [["#2340a8", "#101a45"], ["#0f766e", "#083c38"], ["#9a3412", "#431407"], ["#6d28d9", "#2e1065"], ["#be123c", "#4c0519"]];
  const [a, b] = palettes[title.length % palettes.length];
  const words = title.split(/\s+/);
  const lines = [];
  for (const w of words) {
    const last = lines[lines.length - 1];
    if (last && (last + " " + w).length <= 26) lines[lines.length - 1] = last + " " + w;
    else lines.push(w);
  }
  const tspans = lines.slice(0, 4).map((l, i) => `<tspan x="80" dy="${i ? 84 : 0}">${xml(l)}</tspan>`).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 675"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1200" height="675" fill="url(#g)"/><circle cx="1080" cy="110" r="190" fill="#fff" opacity=".06"/><circle cx="1130" cy="600" r="120" fill="#fff" opacity=".05"/><text x="80" y="110" font-family="Inter,Arial,sans-serif" font-size="30" font-weight="700" fill="#f0a65a" letter-spacing="3">${xml(categoryName.toUpperCase())}</text><text y="${330 - (Math.min(lines.length, 4) - 1) * 42}" font-family="Inter,Arial,sans-serif" font-size="72" font-weight="800" fill="#fff">${tspans}</text><text x="80" y="620" font-family="Inter,Arial,sans-serif" font-size="28" fill="#c9d3ff">universianity.com</text></svg>`;
}

// ---------- main ----------

function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").split("-").slice(0, 9).join("-");
}

async function main() {
  const existing = await loadExisting();
  if (!process.env.FORCE && existing.some((p) => p.date === today)) {
    console.log(`A post for ${today} already exists — nothing to do.`);
    return;
  }

  const category = pickCategory();
  console.log(`Category: ${category.name}`);

  const { notes, sources } = await research(category, existing.slice(0, 80).map((p) => p.title));
  console.log(`Research done: ${sources.size} sources`);

  const article = await writeArticle(category, notes, sources);
  let slug = slugify(article.slug || article.title) || `post-${today}`;
  if (existing.some((p) => p.slug === slug)) slug = `${slug}-${today}`;
  console.log(`Writing: ${article.title} (${slug})`);

  const links = await cleanLinks(article.links, sources);
  console.log(`Links kept: ${links.length}/${article.links.length}`);

  await fs.mkdir(IMG_DIR, { recursive: true });
  const png = await aiImage(article.image_prompt);
  let image;
  if (png) {
    image = `/images/posts/${slug}.jpg`;
    await fs.writeFile(path.join(IMG_DIR, `${slug}.jpg`), png);
  } else {
    image = `/images/posts/${slug}.svg`;
    await fs.writeFile(path.join(IMG_DIR, `${slug}.svg`), fallbackCover(article.title, category.name));
  }

  // JSON strings are valid YAML scalars, which keeps quoting safe.
  const q = JSON.stringify;
  const frontmatter = [
    "---",
    `title: ${q(article.title)}`,
    `description: ${q(article.description)}`,
    `pubDate: ${q(today)}`,
    `category: ${q(category.slug)}`,
    `tags: ${q(article.tags.map((t) => t.toLowerCase()).slice(0, 6))}`,
    `image: ${q(image)}`,
    `imageAlt: ${q(article.image_alt)}`,
    `links: ${q(links)}`,
    "---",
    "",
  ].join("\n");

  await fs.writeFile(path.join(BLOG_DIR, `${slug}.md`), frontmatter + article.body_markdown.trim() + "\n");
  console.log(`Saved src/content/blog/${slug}.md`);
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) console.error("Invalid ANTHROPIC_API_KEY.");
  else if (err instanceof Anthropic.RateLimitError) console.error("Rate limited by the Claude API — try again later.");
  else if (err instanceof Anthropic.APIError) console.error(`Claude API error ${err.status}: ${err.message}`);
  else console.error(err);
  process.exit(1);
});
