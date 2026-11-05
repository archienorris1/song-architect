# Song Architect marketplace prototype

Song Architect is an artist-founded marketplace concept from Archie and Jack. Artists can find vetted music professionals by genre, service and budget, or use a short guide to figure out what to book. Professionals choose the work they take, set prices and define scope, delivery and revision terms.

[Private interactive prototype](https://song-architect-studio-concept.archienorris.chatgpt.site)

## Production and DNS

The marketplace prototype is deployed on the Vercel project `song-architect-site`. [Open the production site](https://songarchitect.co.uk).

Squarespace manages the DNS. The apex A record points to `76.76.21.21`. The `www` CNAME points to `3699ca4b8b8a2a29.vercel-dns-017.com`. Vercel sends a permanent 308 redirect from `www` to the apex. Both records replace the former Shopify routing.

Source for this release is on the [marketplace-prototype branch](https://github.com/archienorris1/song-architect/tree/marketplace-prototype). The proposed `.studio` move is a separate launch step.

## What to try

- [What do I need?](https://song-architect-studio-concept.archienorris.chatgpt.site/#guide) suggests a service and carries the artist's answer into a draft brief.
- [SA Endorsed roster](https://song-architect-studio-concept.archienorris.chatgpt.site/#talent) illustrates an invite and application process. A pro can show track examples, their contribution, favourite genres and reviews earned on SA.
- [Link-in-bio and promo tools](https://song-architect-studio-concept.archienorris.chatgpt.site/#promo) demonstrate a shareable booking profile, caption, PNG and Manychat script.
- [Rewards](https://song-architect-studio-concept.archienorris.chatgpt.site/#rewards) simulates repeat bookings. After three qualifying songs, the artist unlocks an illustrative £75 credit, the pro's next repeat fee moves from 12% to 10%, and their rank improves among relevant matches.
- [Daylight messages](https://song-architect-studio-concept.archienorris.chatgpt.site/#thread) includes two playable versions and timestamped notes. [Pro notification settings](https://song-architect-studio-concept.archienorris.chatgpt.site/#notifications) shows working hours, project mute and digest preferences.
- [Our Story](https://song-architect-studio-concept.archienorris.chatgpt.site/#story) introduces Archie and Jack and why they are building SA.

The guide uses scripted responses. Demo messages, preferences and reward progress are stored in the current browser. Profiles, prices and examples are illustrative. Payments, AI responses and notification delivery remain future integrations. Shared accounts, projects and professional profile setup are connected to Supabase as described below.

## Local preview

Run `python3 -m http.server 4173 --directory dist` from the prototype root. Open `http://localhost:4173`. The site is static and requires no build or secrets.

## Product decisions to validate before launch

- Use the application as a draft profile. Collect services, favourite genres and a small portfolio with explicit credits. Keep endorsement and verified SA reviews distinct.
- Show price, deliverables, dates, included revision rounds and extra-revision hourly rate before booking. Extra work requires an approved estimate and cap.
- Explore a funded booking with two professional payout milestones through Stripe Connect. Define review, cancellation and dispute rules. Show Klarna only for eligible orders and verify payment settlement, payout timing and refund behavior.
- Start with GBP as the quote currency if it simplifies launch. Treat local prices as estimates until local-currency checkout is supported. Confirm the exact charge and currency before payment and show pros their expected payout currency and fees.
- Confirm SA's role as agent or supplier with a UK VAT adviser before fixing commission or billing flows. Model VAT, payment fees, refunds and rewards separately. A 15% fee on a £100 booking inclusive of 20% VAT leaves £12.50 before other costs if only the fee is taxable.

## Shared accounts and projects

Open https://songarchitect.co.uk/#account and sign in with Google or a confirmed email and password. The existing Song Architect Supabase project hosts the workspace. Email uses the built-in sender, so custom SMTP is needed for general signup delivery.

Create a project as the artist and enter the professional's exact sign-in email. Share the project link with them. The professional sees the brief, sends a quote and adds audio versions. The artist accepts the scope, leaves messages and timestamped notes, requests included revisions and approves delivery. Current testing collects no payments.

Project access is enforced by RLS and database triggers, independently of the marketing audience switch. The project state uses an optimistic row version. Delivery and revision operations commit atomically and accept stable request IDs for safe retries. Automatic refresh runs every six seconds while the workspace is visible.

Use npm ci and npm run build to bundle the pinned Supabase client. Serve the repository root to preview the website. SQL definitions are in database/marketplace.sql. The transactional marketplace-check.sql exercises the handoff and access restrictions and rolls its test records back. Backend configuration contains only a publishable key.

The existing local booking demo remains separate from shared projects. Professionals can upload WAV, MP3, M4A, AAC, FLAC or OGG files up to 50 MB. Uploads use resumable chunks with progress and automatic retry. Files live in the private sa-project-audio bucket, and participant-only temporary URLs enable audio playback and seeking. Direct HTTPS audio links remain available as a secondary option. The audio-uploads.sql and audio-policy-fix.sql changes extend the original schema. Project invitations are shared through their link rather than email notifications.

## Professional profile setup

Open https://songarchitect.co.uk/#my-profile after signing in. Three sections collect a professional introduction and up to four favourite genres, a main service with GBP price and scope, delivery time, included revision rounds and extra hourly rate, then up to four work examples with contribution credits. Work can use supported release links or resumable audio uploads up to 50 MB. The payout estimate uses the current 10% platform fee.

Professionals can save an incomplete draft, preview privately and submit a completed profile for SA review. Drafts and unpublished samples are owner-only. Publication currently requires an SA administrator to copy the reviewed draft to sa_pro_public_profiles through Supabase. A listed snapshot remains unchanged while the owner edits a new draft. Setting is_listed to false withdraws the profile and its public sample access. No professional can approve their own listing.

Approved profiles appear in the roster and have a shareable #pro-UUID page. Artists can request a quote without knowing the professional's email. The server resolves the approved professional and snapshots the reviewed package terms into the project. The quote form starts with the listed price, scope and revision terms. Google sign-in returns artists to their selected professional.

Schema additions are database/pro-profiles.sql, pro-profile-visibility.sql and pro-profile-package-snapshot.sql. Run pro-profile-check.sql for a transactional regression check covering draft privacy, publication permissions, reviewed snapshots, quote request retries and withdrawn listings. It rolls back its synthetic records.
