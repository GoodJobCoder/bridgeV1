# Bridge — Connecting Community Needs With Community Action

Bridge helps community organizations find suitable volunteers and helps volunteers discover meaningful opportunities, with matching that is transparent, safe, and measurable.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for matching, workflow, and impact rules
npm run build    # production build in dist/
```

With no configuration, the app stores data in the browser (localStorage) and loads fictional demo data on first visit, so the full flow works offline.

### Use Base44's database

1. In your Base44 app, create the five entities defined in `base44/entities/*.json` (Organization, Opportunity, VolunteerProfile, Assignment, Report).
2. Copy `.env.example` to `.env` and set `VITE_BASE44_APP_ID` to your app ID (found in the Base44 editor URL).
3. Restart `npm run dev`. The footer will read "Storage: Base44 database". Load demo records from **How It Works → Demo data**.

Both storage backends expose the same `list / filter / get / create / update / delete` interface (`src/api/client.js`), so no other code changes.

## Pages

| Route | Page |
| --- | --- |
| `/` | Home dashboard: snapshot stats, most urgent needs, navigation |
| `/needs` | Community Needs Board: search and filter by category, urgency, skill, and availability |
| `/match` | Volunteer Match Explorer: enter a profile and get ranked, explained matches |
| `/organizations` | Organization Dashboard: post and edit listings, approve or decline requests, verify completions |
| `/impact` | Impact Dashboard: pending requests, pending commitments, verified completions, and coverage |
| `/moderation` | Moderation queue for reported listings |
| `/how-it-works` | Plain-language explanation of every rule and weight, plus demo data controls |

## Project layout (where the logic lives)

```
src/
  config/taxonomy.js        fixed lists: skills, time slots, categories, urgency, age bands
  matching/                 THE MATCHING ALGORITHM (pure functions, no UI)
    weights.js              every tunable number (45 / 35 / 20, skill weights, interest shares)
    eligibility.js          pass/fail filters (age, supervision, background check, schedule, capacity)
    scoring.js              the three score components, each returning points + explanation text
    rank.js                 filter → score → sort, with deterministic tie-breaking
    matching.test.js
  workflow/assignments.js   assignment lifecycle rules (duplicates, approval, capacity, completion)
  impact/metrics.js         impact numbers, always split into real vs simulated
  state/DataContext.jsx     loads data and runs every write through the workflow rules
  api/client.js             Base44 SDK or localStorage, same interface
  data/demoData.js          fictional demo organizations, listings, and volunteers
  pages/, components/       React UI
```

Everything in `matching/`, `workflow/`, and `impact/` is plain JavaScript with no React, so it can be tested and explained on its own.

## The matching algorithm

**Step 1, eligibility filters.** A listing is removed from a volunteer's ranked list (and shown separately with the reason) if any rule fails:

| Rule | Passes when |
| --- | --- |
| `listing_open` | Listing status is open (not closed or hidden by moderation) |
| `capacity` | At least one spot remains (only confirmed and completed assignments hold spots) |
| `minimum_age` | The volunteer's age band meets the listing's minimum age |
| `minor_supervision` | A volunteer under 18 only matches supervised listings |
| `adult_minor_safeguard` | An adult only matches a minor-serving listing if it is supervised and they have a background check |
| `background_check` | The volunteer reports a background check when the listing requires one |
| `schedule` | "All slots mandatory": free for every slot. "Any slot": free for at least one |

**Step 2, compatibility score (0–100).**

- **Skills (45):** required skills weigh 2 and preferred skills weigh 1. Points = matched weight ÷ total weight × 45.
- **Availability (35):** overlapping slots ÷ listed slots × 35. A flexible schedule earns full points.
- **Interests (20):** primary category in the volunteer's interests earns 20; a secondary category only earns 10; otherwise 0.

Each component is rounded and then summed. Ties are broken by urgency, then open spots, then title. The UI shows every component's arithmetic under **"Why this score?"**.

The score measures how well a listing fits the profile entered. It is **not** a probability of success, and the UI says so wherever scores appear.

To experiment, change a number in `src/matching/weights.js` (keep the three maximums summing to 100), or add an object to `ELIGIBILITY_RULES` in `eligibility.js`. Both changes show up automatically on the How It Works page.

## Approval and impact flow

```
interested ──(org approves)──> confirmed ──(org verifies hours)──> completed
     ├──(org declines)──> declined   └──(cancel)──> cancelled
     └──(volunteer withdraws)──> withdrawn
```

- A volunteer can't make a second active request for the same listing.
- Only the posting organization can approve, decline, or verify.
- Eligibility and capacity are re-checked at approval time. Because the database has no transactions, the approval is re-checked after writing and rolled back if a simultaneous approval overfilled the listing.
- If a listing requires a background check, or an adult will work with minors, the organization must confirm it personally verified the check (profiles only hold a self-reported flag).
- Hours exist only when an organization enters the actual hours served (at most 24 per verification). Nothing is estimated.
- Any assignment involving a demo profile or demo listing is flagged `simulated` and reported separately on the Impact Dashboard. Seeded demo data includes no completions or hours.

## Safety and privacy

- No contact information is collected. Volunteers have a display name and an age band, never a birth date, email, or phone number. Organizations send check-in details in a private approval note that only that volunteer sees.
- All organizations are labeled **Unverified** because identity verification is not implemented.
- Every listing has a **Report** button. Three open reports hide a listing automatically until a moderator restores it or confirms the hide.
- Listings that involve minors must have on-site supervision.

### Known limitations (and how to address them in production)

- **No login.** For demonstration, anyone can act as any volunteer, organization, or moderator. In production, use Base44 auth and roles, restrict the moderation page to moderators, and limit Organization Dashboard actions to members of that organization.
- **Client-side enforcement.** The rules run in the browser. With Base44, also add entity-level security rules (or backend functions) so the same checks can't be bypassed. In particular, `org_note` should only be readable by the volunteer and the organization.
- **Background checks are self-reported.** Bridge records the organization's attestation but does not verify checks itself.
