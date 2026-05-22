# Fonts Folder

This folder does not contain binary font files.

The WiseResume / WiseHire font system uses **Inter** with weights `400`, `500`, `600`, `700`, and `800`.

Production implementation should load Inter via the app dependency layer:

```bash
npm install @fontsource/inter
```

Then import the required weights once in the app entry file:

```ts
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
```

See `../FONT_SYSTEM.md` for full rules, Tailwind mapping, CSS variables, type scale, and AI-agent instructions.
