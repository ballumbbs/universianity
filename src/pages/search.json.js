import { getPosts } from "../lib/posts";

// Small index the search page downloads once and filters in the browser.
export async function GET() {
  const posts = await getPosts();
  const index = posts.map((p) => ({
    url: `/blog/${p.id}/`,
    title: p.data.title,
    description: p.data.description,
    category: p.data.category,
    tags: p.data.tags,
    date: p.data.pubDate.toISOString().slice(0, 10),
  }));
  return new Response(JSON.stringify(index), { headers: { "Content-Type": "application/json" } });
}
