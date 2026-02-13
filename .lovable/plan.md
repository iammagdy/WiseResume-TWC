

## Restore Developer Credit Card at Bottom of Settings

### Overview
Restore the original holographic `DeveloperCreditCard` component in the Settings page, replacing the compact `SettingsRow` that was added in the previous refactor. Place it at the very bottom of the page, after the footer text.

### Changes

**File: `src/pages/SettingsPage.tsx`**

#### 1. Re-add imports
- Add back `import developerPhoto from '@/assets/developer-photo.png';`
- Add back lazy import for `DeveloperCreditCard`:
  ```
  const DeveloperCreditCard = lazy(() => import('@/components/settings/DeveloperCreditCard').then(m => ({ default: m.DeveloperCreditCard })));
  ```

#### 2. Replace compact developer SettingsRow (lines 540-552)
- Remove the "Created by Magdy Saber" `SettingsRow` and its `<Separator>` from the About section card
- The "Get Help" row remains as the first item in that card

#### 3. Move DeveloperCreditCard to very bottom (after line 603)
- After the footer text ("WiseResume v1.0.0" / "Made with love in Egypt"), add:
  ```tsx
  <Suspense fallback={null}>
    <DeveloperCreditCard
      name="Magdy Saber"
      title="Creator & Developer"
      avatarUrl={developerPhoto}
      websiteUrl="https://magdysaber.com"
      onContactClick={() => window.open('mailto:contact@magdysaber.com')}
    />
  </Suspense>
  ```
- Add bottom padding (`pb-10`) to ensure spacing below the card

### Files Modified
1. `src/pages/SettingsPage.tsx` -- restore developer card import and render at bottom
