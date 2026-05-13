# Edge Function: generate-fix-suggestions

**Last verified:** 2026-05-06 (Task #45)
**Route:** `POST /functions/v1/generate-fix-suggestions`
**Auth:** `verify_jwt = false` (manual `requireAuth` inside handler)
**Feature name:** `tailor-resume` (AI routing + credit deduction)

## Purpose
Generates up to 5 atomic, individually-applicable fix suggestions for a tailored resume, based on the pre-validation result (missing keywords and quality issues). Called automatically from `TailorPage` after `validate-tailor` completes.

## Request body
| Field | Type | Description |
|---|---|---|
| `finalResume` | `object` | The merged resume snapshot (output of `buildMergedResume`) |
| `jobDescription` | `string` | Raw job description text |
| `missing_keywords` | `string[]` | Keywords flagged as missing by `validate-tailor` |
| `issues` | `string[]` | Quality issues flagged by `validate-tailor` |

## Response
`200 application/json` — always returns an array (empty `[]` on any error, never throws 5xx to the client).

Each element is a `FixSuggestion`:
```ts
{
  type: 'add_skill' | 'improve_bullet' | 'enhance_summary';
  section: 'skills' | 'experience' | 'summary';
  target_id?: string;   // "<experienceId>-<bulletIndex>" for improve_bullet
  before?: string;
  after: string;
  reason: string;
}
```

## AI call
- `callAIWithRetry`, `featureName: 'tailor-resume'`, `temperature: 0.2`, `maxTokens: 800`, `jsonMode: true`
- System prompt enforces: type/section enum, ≤160 chars for bullets, ≤400 chars for summary, no generic phrases

## Post-processing guards (in order)
1. VALID_TYPES and VALID_SECTIONS set check
2. `after.trim().length < 10` — drop
3. Generic-phrase check (`responsible for`, `worked on`, `helped with`, `assisted in`, `participated in`, `contributed to`) — drop
4. `improve_bullet` only: `target_id` parsed with `lastIndexOf('-')` (UUID-safe); experienceId must exist in resume; bulletIndex must be in bounds; `isBulletRelevant()` must pass (≥2 overlapping non-stop-word tokens OR ≥25% token overlap)
5. `slice(0, 5)` — cap at 5
