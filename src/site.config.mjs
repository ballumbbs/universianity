// Central site settings. Shared by the Astro pages and the post generator.
export const SITE = {
  name: "Universianity",
  tagline: "Smarter paths through university, scholarships and careers",
  url: "https://universianity.com",
  description:
    "Daily guides on admissions, scholarships, study skills, study abroad and careers — plus a curated library of the most useful student resources.",
  email: "hello@universianity.com",
  // Paste your form endpoint (Buttondown, ConvertKit, Mailchimp...) to switch on the newsletter box.
  newsletterAction: "",
  // Paste your AdSense publisher id (ca-pub-XXXX) once approved; ad slots stay hidden until then.
  adsenseClient: "",
};

export const CATEGORIES = [
  { slug: "admissions", name: "Admissions", blurb: "Applications, essays, tests and choosing the right university." },
  { slug: "scholarships", name: "Scholarships & Funding", blurb: "Scholarships, grants, financial aid and budgeting." },
  { slug: "study-skills", name: "Study Skills", blurb: "Learning techniques, exams, productivity and research." },
  { slug: "careers", name: "Careers & Internships", blurb: "Internships, CVs, interviews and first jobs." },
  { slug: "study-abroad", name: "Study Abroad", blurb: "Countries, visas, costs and life as an international student." },
  { slug: "ai-tech", name: "AI & Tech for Students", blurb: "Tools, skills and the responsible use of AI in study." },
  { slug: "student-life", name: "Student Life & Wellbeing", blurb: "Health, money, housing and making the most of university." },
];

export const categoryBySlug = (slug) => CATEGORIES.find((c) => c.slug === slug);
