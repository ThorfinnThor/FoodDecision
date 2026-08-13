import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("keeps public cutover explicit, protected, serialized, and reversible", async () => {
  const workflow = await readFile(new URL("../.github/workflows/public-readiness-cutover.yml", import.meta.url), "utf8");
  assert.match(workflow, /options:\n\s+- readiness\n\s+- cutover\n\s+- rollback/);
  assert.match(workflow, /group: public-domain-cutover/);
  assert.match(workflow, /environment: public-production/g);
  assert.match(workflow, /Confirmation must be exactly/);
  assert.match(workflow, /Verify rollback target before changing the alias/);
  assert.match(workflow, /Restore previous deployment when verification fails/);
  assert.match(workflow, /Verify automatic rollback/);
  assert.match(workflow, /immutable HTTPS vercel\.app URL/);
  assert.match(workflow, /actions\/upload-artifact@[a-f0-9]{40}/);
  assert.doesNotMatch(workflow, /actions\/upload-artifact@v\d/);
});

test("documents legal, DNS, approval, evidence, and rollback prerequisites", async () => {
  const runbook = await readFile(new URL("../docs/public-readiness-and-cutover.md", import.meta.url), "utf8");
  for (const expected of [
    "NEXT_PUBLIC_SITE_URL",
    "NEXT_PUBLIC_OPERATOR_NAME",
    "NEXT_PUBLIC_PRIVACY_CONTACT",
    "public-production",
    "known-good rollback deployment",
    "CUTOVER compareyourfood.com",
    "ROLLBACK compareyourfood.com",
    "Google Search Console",
  ]) assert.match(runbook, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});
