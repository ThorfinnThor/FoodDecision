import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteLocale } from "./types.ts";

export type EditorialAuthor = {
  name: string;
  role: string;
};

export type EditorialCriterion = {
  title: string;
  body: string;
};

export type EditorialFaq = {
  question: string;
  answer: string;
};

export type EditorialSource = {
  publisher: string;
  title: string;
  url: string;
  note: string;
};

export type SeoEditorialContent = {
  path: string;
  locale: SiteLocale;
  reviewedAt: string;
  author: EditorialAuthor;
  answerTitle: string;
  answer: string;
  introduction: string[];
  criteria: EditorialCriterion[];
  limitations: string[];
  faq: EditorialFaq[];
  sources: EditorialSource[];
};

export type EditorialQuality = {
  wordCount: number;
  blockers: string[];
};

const contentPath = join(process.cwd(), "data-config", "seo", "editorial-content.json");
export const seoEditorialContent = JSON.parse(readFileSync(contentPath, "utf8")) as SeoEditorialContent[];

export function getSeoEditorialContent(path: string) {
  return seoEditorialContent.find((content) => content.path === path);
}

function editorialText(content: SeoEditorialContent) {
  return [
    content.answerTitle,
    content.answer,
    ...content.introduction,
    ...content.criteria.flatMap((criterion) => [criterion.title, criterion.body]),
    ...content.limitations,
    ...content.faq.flatMap((item) => [item.question, item.answer]),
    ...content.sources.flatMap((source) => [source.publisher, source.title, source.note]),
  ].join(" ");
}

export function editorialWordCount(content: SeoEditorialContent) {
  return editorialText(content).trim().split(/\s+/u).filter(Boolean).length;
}

export function evaluateEditorialContent(content: SeoEditorialContent | undefined): EditorialQuality {
  if (!content) return { wordCount: 0, blockers: ["missing_editorial_content"] };

  const blockers: string[] = [];
  const wordCount = editorialWordCount(content);
  if (wordCount < 600) blockers.push("insufficient_editorial_depth");
  if (content.introduction.length < 2) blockers.push("insufficient_introduction");
  if (content.criteria.length < 4) blockers.push("insufficient_decision_criteria");
  if (content.limitations.length < 3) blockers.push("insufficient_limitations");
  if (content.faq.length < 4) blockers.push("insufficient_editorial_faq");
  if (content.sources.length < 3) blockers.push("insufficient_sources");
  if (!content.author.name.trim() || !content.author.role.trim()) blockers.push("missing_authorship");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(content.reviewedAt)) blockers.push("invalid_review_date");
  if (content.sources.some((source) => !source.url.startsWith("https://"))) blockers.push("invalid_source_url");
  if (new Set(content.sources.map((source) => source.url)).size !== content.sources.length) blockers.push("duplicate_source_url");

  return { wordCount, blockers };
}

