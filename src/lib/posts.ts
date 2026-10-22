import { getCollection, type CollectionEntry } from "astro:content";

export type Post = CollectionEntry<"blog">;

export async function getPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) => !data.draft);
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

export function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}

export function readingTime(body: string): number {
  return Math.max(1, Math.round(body.split(/\s+/).length / 220));
}

/** Posts sharing the category or tags, best matches first. */
export function relatedPosts(post: Post, all: Post[], n = 3): Post[] {
  return all
    .filter((p) => p.id !== post.id)
    .map((p) => {
      const shared = p.data.tags.filter((t) => post.data.tags.includes(t)).length;
      return { p, score: shared + (p.data.category === post.data.category ? 2 : 0) };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((x) => x.p);
}
