# QA Remediation Report

Date: 2026-08-09  
Source report: `docs/qa-exploratory-2026-08-09.md`  
Status: All eight confirmed issues fixed and verified locally

## Summary

| Issue | Severity | Status | Resolution |
| --- | --- | --- | --- |
| QA-001 Search cannot be cleared | High | Fixed | Search input now has independent debounced state, clears the URL correctly and provides an explicit reset action in the empty state. |
| QA-002 Overall score saturation | High | Fixed | Strong nutrition values use calibrated curves, perfect scores are reserved for exceptional values, the ranking audit blocks renewed saturation and equal scores show their ordering evidence. |
| QA-003 Mobile comparison clipping | Medium | Fixed | Comparison rows switch to labeled stacked values below 600 px, so both products and the advantage remain visible. |
| QA-004 Negative Finder values | Medium | Fixed | UI, URL and saved state use the same bounded parser. Negative values are rejected and excessive values are capped. |
| QA-005 Broken product metadata | Medium | Fixed | Retail price and package text are removed, invalid brands are rejected, known brands can be recovered and legacy URLs redirect to a clean canonical slug. |
| QA-006 Oversized comparison selects | Medium | Fixed | The two full catalog selects were replaced with searchable comboboxes limited to twelve visible results. |
| QA-007 Wrong barcode validation copy | Low | Fixed | Character, length and checksum failures are classified separately before catalog lookup. |
| QA-008 Mobile menu semantics | Low | Fixed | The menu trigger is a real button with `aria-expanded` and `aria-controls`. |

## Verification

- `npm test`: 100 tests passed, including build, SEO validation and ranking integrity audit.
- `npm run lint`: passed without warnings.
- `npx tsc --noEmit`: passed.
- Browser regression: search set, clear and reset paths passed.
- Browser regression: comparison search selected two products and opened the expected pair.
- Browser regression: negative Finder state was absent after parsing.
- Browser regression: alphabetic barcode input returned the digits-only message.
- Browser console: no errors or warnings during the regression flow.

The production catalog is recalculated from Supabase during deployment, so the score calibration and legacy metadata cleanup apply to the full catalog at the next Vercel build. The malformed legacy product URL remains resolvable and permanently redirects to its cleaned canonical URL.
