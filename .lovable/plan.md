
# Unit Tests for InterviewSetup Banner Visibility

## Goal
Add tests that verify the conditional rendering of banners and mic test button based on `speechRecognitionAvailable` and `speechSupported` props.

## Test File
Create `src/components/interview/__tests__/InterviewSetup.test.tsx`

## Test Cases

| # | Scenario | speechRecognitionAvailable | speechSupported | Expected |
|---|----------|---------------------------|-----------------|----------|
| 1 | Full support (Chrome desktop) | true | true | No banners shown, mic test visible |
| 2 | Speech available, mic blocked | true | false | "Microphone access" banner shown, mic test visible |
| 3 | No speech recognition (Android WebView) | false | false | "Voice input is not available" amber banner shown, mic test hidden |
| 4 | No resume loaded | true | true | "No resume loaded" banner shown |

## Mocking Strategy
- Mock `framer-motion` to render children without animation (avoids jsdom issues)
- Mock `@/lib/haptics` to no-op
- Mock `CompanyBriefingSheet` to a stub
- Provide minimal required props with `vi.fn()` for callbacks

## Technical Details

### File created
| File | Purpose |
|------|---------|
| `src/components/interview/__tests__/InterviewSetup.test.tsx` | 4 test cases verifying banner and mic test visibility |

### Assertions used
- `screen.queryByText(...)` to check banner text presence/absence
- `screen.queryByText("Test Microphone")` to verify mic test button visibility
