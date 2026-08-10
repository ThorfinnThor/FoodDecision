import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  aiCrawlerPolicy,
  buildLlmsFull,
  buildLlmsIndex,
} from "../lib/geo.ts";

test("separates AI search access from model training access", () => {
  assert.ok(aiCrawlerPolicy.search.includes("OAI-SearchBot"));
  assert.ok(aiCrawlerPolicy.search.includes("Claude-SearchBot"));
  assert.ok(aiCrawlerPolicy.search.includes("PerplexityBot"));
  assert.ok(aiCrawlerPolicy.training.includes("GPTBot"));
  assert.ok(aiCrawlerPolicy.training.includes("ClaudeBot"));
  assert.ok(aiCrawlerPolicy.training.includes("Google-Extended"));
  assert.deepEqual(
    aiCrawlerPolicy.search.filter((crawler) => aiCrawlerPolicy.training.includes(crawler)),
    [],
  );
});

test("publishes a concise LLM directory with provenance and limitations", () => {
  const content = buildLlmsIndex();

  assert.match(content, /^# Compare Your Food/m);
  assert.match(content, /German ranking hub/);
  assert.match(content, /US ranking hub/);
  assert.match(content, /Editorial policy/);
  assert.match(content, /Missing values are not treated as zero/);
  assert.match(content, /Open Food Facts/);
  assert.match(content, /Open Database License 1\.0/);
  assert.match(content, /llms-full\.txt/);
});

test("publishes a full bilingual ranking directory without inventing data", () => {
  const content = buildLlmsFull();

  assert.match(content, /German market and German language/);
  assert.match(content, /United States market and US English/);
  assert.match(content, /Catalog generated:/);
  assert.match(content, /eligible products/);
  assert.match(content, /Editorial answer:/);
  assert.match(content, /Supporting sources:/);
  assert.match(content, /U\.S\. Food and Drug Administration|Deutsche Gesellschaft für Ernährung/);
  assert.match(content, /Product data may be incomplete|current package label/i);
  assert.doesNotMatch(content, /medical recommendation/i);
});

test("serves LLM resources as static plain text routes", async () => {
  const [indexRoute, fullRoute, robotsRoute] = await Promise.all([
    readFile(new URL("../app/llms.txt/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/llms-full.txt/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/robots.ts", import.meta.url), "utf8"),
  ]);

  assert.match(indexRoute, /force-static/);
  assert.match(fullRoute, /force-static/);
  assert.match(`${indexRoute}\n${fullRoute}`, /text\/plain; charset=utf-8/);
  assert.match(robotsRoute, /aiCrawlerPolicy\.search/);
  assert.match(robotsRoute, /aiCrawlerPolicy\.training/);
});
