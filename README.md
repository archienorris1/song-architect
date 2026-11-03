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

The guide uses scripted responses. Demo messages, preferences and reward progress are stored in the current browser. Profiles, prices and examples are illustrative. Booking, payments, AI, user accounts, shared messaging and notification delivery are future integrations.

## Local preview

Run `python3 -m http.server 4173 --directory dist` from the prototype root. Open `http://localhost:4173`. The site is static and requires no build or secrets.

## Product decisions to validate before launch

- Use the application as a draft profile. Collect services, favourite genres and a small portfolio with explicit credits. Keep endorsement and verified SA reviews distinct.
- Show price, deliverables, dates, included revision rounds and extra-revision hourly rate before booking. Extra work requires an approved estimate and cap.
- Explore a funded booking with two professional payout milestones through Stripe Connect. Define review, cancellation and dispute rules. Show Klarna only for eligible orders and verify payment settlement, payout timing and refund behavior.
- Start with GBP as the quote currency if it simplifies launch. Treat local prices as estimates until local-currency checkout is supported. Confirm the exact charge and currency before payment and show pros their expected payout currency and fees.
- Confirm SA's role as agent or supplier with a UK VAT adviser before fixing commission or billing flows. Model VAT, payment fees, refunds and rewards separately. A 15% fee on a £100 booking inclusive of 20% VAT leaves £12.50 before other costs if only the fee is taxable.
