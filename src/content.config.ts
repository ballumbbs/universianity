import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    category: z.string(),
    tags: z.array(z.string()).default([]),
    image: z.string(),
    imageAlt: z.string().default(""),
    links: z
      .array(z.object({ title: z.string(), url: z.string().url(), note: z.string().optional() }))
      .default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
