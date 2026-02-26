

# Create Master Recreation Prompt File

## Overview
Create a new file `docs/RECREATE_DOCS_PROMPT.md` containing a single, comprehensive prompt that you can paste into a new Lovable project to instruct it to recreate all 13 documentation files from the `docs/` folder.

## The Challenge
The 13 docs files total ~10,000+ lines. A single prompt cannot contain all that content. The solution is a **sequenced meta-prompt** that tells the new Lovable project to create each file one-by-one across multiple messages, with detailed descriptions of what each file must contain.

## File List to Recreate (13 files, ordered by dependency)

| # | File | Lines | Description |
|---|------|-------|-------------|
| 1 | `docs/PROJECT_OVERVIEW.md` | 695 | App identity, features, tech stack summary |
| 2 | `docs/APP_BLUEPRINT.md` | 2,278 | Complete web app blueprint (screens, models, design tokens, routes) |
| 3 | `docs/APP_BLUEPRINT_FLUTTER.md` | 2,268 | Complete Flutter app blueprint (widgets, GoRouter, Riverpod) |
| 4 | `docs/DB_FEATURE_MAP.md` | 156 | Database tables mapped to features and data flows |
| 5 | `docs/MOBILE_RESPONSIVENESS_PLAN.md` | 323 | Mobile-first responsive design rules and breakpoints |
| 6 | `docs/perf-checklist.md` | 42 | QA checklist for mobile performance |
| 7 | `docs/PROGRESS_TILL_NOW.md` | 222 | Current project status report |
| 8 | `docs/INSPIRATION_WEB.md` | ~200 | Web competitors and design sources |
| 9 | `docs/INSPIRATION_FLUTTER.md` | ~200 | Mobile app competitors and design sources |
| 10 | `docs/STITCH_PROMPTS_WEB.md` | ~1,200 | 28 Google Stitch prompts for web screens |
| 11 | `docs/STITCH_PROMPTS_FLUTTER.md` | ~1,400 | 30 Google Stitch prompts for mobile screens |
| 12 | `docs/REBUILD_PROMPTS.md` | ~3,500 | 52-step sequential rebuild prompts for web |
| 13 | `docs/REBUILD_PROMPTS_FLUTTER.md` | ~3,500 | 55-step sequential rebuild prompts for Flutter |

## What the Prompt File Will Contain

### Section 1: Master Instruction
A system-level instruction block telling the receiving Lovable AI:
- Create files one at a time (they are too large for a single message)
- Follow the exact order listed
- After each file, confirm completion and move to the next
- Use the exact file paths under `docs/`

### Section 2: Per-File Specifications
For each of the 13 files, a detailed specification including:
- Exact file path
- Purpose and audience
- Complete table of contents / section headings
- Key data points that MUST be included (color tokens, route paths, table names, template IDs, etc.)
- Approximate target length
- Cross-references to other docs files

### Section 3: Validation Checklist
A final checklist the AI should run after all 13 files are created to ensure consistency across them (same color tokens, same route names, same table names, etc.)

## Technical Details
- **File created**: `docs/RECREATE_DOCS_PROMPT.md`
- **No other files modified**
- **Estimated size**: ~1,500-2,000 lines (detailed specs for all 13 files)
- The prompt extracts key specs from each existing file (design tokens, routes, models, table schemas) so the receiving AI can reproduce them faithfully without seeing the originals

