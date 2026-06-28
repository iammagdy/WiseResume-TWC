# Social Preview and Landing Route Design

## Goal

Keep the public WiseResume landing page accessible to every visitor, including authenticated WiseHire users, and provide one reliable branded social preview for public landing links.

## Current State

The social-preview work introduced an authenticated HR redirect inside `src/pages/Index.tsx`. Commit `1a93e189` removed that redirect locally, but the production deployment predates the fix. The live site serves a valid PNG card and static Open Graph tags, but the declared `1200x630` dimensions do not match the delivered `1280x672` image. Client-side scripts also attempt to replace the card with a favicon for WiseHire routes, which social crawlers cannot reliably observe.

## Design

The root and enterprise landing routes will use the same static WiseResume social card. `index.html` will contain complete crawler-visible Open Graph and X metadata with absolute HTTPS URLs, the PNG MIME type, matching `1280x672` dimensions, and accessible alt text. Runtime landing-page code will only manage browser-visible title, description, URL, and favicons; it will not mutate social image metadata.

The public `/` and `/enterprises` routes will continue to render `AppLanding` regardless of authentication state. Protected product routes remain responsible for account-type redirects.

## Testing

A metadata contract test will read `index.html` and the PNG header, then verify that crawler-visible tags use the production URL and match the actual asset dimensions and format. A landing-route contract test will ensure both public routes remain attached to `AppLanding` and that `Index.tsx` contains no forced WiseHire dashboard redirect.

## Deployment

After targeted tests and the production build pass, deploy the resulting revision to Vercel and verify the live HTML and image using social-crawler user agents. Existing platform caches may require their normal refresh cycle, but the cache-busted image URL will remain available.
