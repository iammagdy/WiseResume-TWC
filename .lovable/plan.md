

## About & Help Footer Enhancement

### Overview
Enhance the Settings footer with a tappable version number showing a changelog, legal/policy links, social media icons, and Egyptian flag branding.

### Changes (all in `src/pages/SettingsPage.tsx`)

#### 1. Tappable Version Number with Changelog Dialog

Replace the plain `WiseResume v1.0.0` text (line 673) with a tappable button that opens a simple changelog dialog.

- Add state: `const [changelogOpen, setChangelogOpen] = useState(false)`
- Version text becomes a button with `underline-offset-2` styling and `text-primary` on hover
- Clicking opens a `Dialog` with a hardcoded changelog:
  - **v1.0.0** -- Initial release: AI writing assistant, 12 templates, ATS scoring, PDF export, cloud sync, biometric lock, interview prep
- Import `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle`, `DialogDescription` (already likely imported or available)

#### 2. Legal Links Row

Below the version number, add a row of plain-text links separated by centered dots:

```
Privacy · Terms · Changelog
```

- "Privacy" links to `https://magdysaber.com/privacy` (opens in new tab)
- "Terms" links to `https://magdysaber.com/terms` (opens in new tab)
- "Changelog" opens the same changelog dialog
- Styled as `text-xs text-muted-foreground hover:text-primary transition-colors`

#### 3. Social Media Icons Row

Add a row of 3 social icon buttons between the links and the "Made in" line:

- Twitter/X icon -- links to `https://x.com/magdysaber`
- LinkedIn icon -- links to `https://linkedin.com/in/magdysaber`
- GitHub icon -- links to `https://github.com/magdysaber`

Each icon is a 36x36px ghost button with `hover:bg-muted/50` and opens in a new tab. Icons sourced from lucide-react: use `Globe` as fallback for X/Twitter (lucide has `Twitter` but it may be the old bird), `Linkedin` from lucide (if available -- will verify), and `Github` from lucide.

#### 4. Egyptian Flag Emoji

Change line 674 from:
```
Made with ❤️ in Egypt
```
to:
```
Made in 🇪🇬
```

### Footer Layout (top to bottom)

```text
[Developer Credit Card]

        WiseResume v1.0.0  (tappable)
      Privacy · Terms · Changelog
        [X] [LinkedIn] [GitHub]
           Made in flag-EG
```

### Technical Details

| Area | Detail |
|------|--------|
| New state | `changelogOpen` boolean |
| New imports | `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` (from `@/components/ui/dialog`); `Github`, `Linkedin`, `Twitter` from `lucide-react` |
| Lines modified | ~672-675 (footer section) |
| New component | Inline changelog dialog rendered in the Sheets/Dialogs section |
| File | Only `src/pages/SettingsPage.tsx` |

