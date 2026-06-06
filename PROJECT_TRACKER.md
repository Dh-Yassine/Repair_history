# AutoHistory — Project Tracker



Aligned with **Main idea.pdf** feature map and UML diagrams.  

Mark `[x]` when done. Update **Current focus** as you go.



**Current focus:** Phase 6 — Privacy, calendar, support  

**Last completed:** Trust badge/share workflow clarity + Supabase deployment direction note



---



## Feature map (PDF ↔ implementation)



### Core



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Sign-up / profile (email, phone) | [x] | 1 | JWT; email + password; phone on profile |

| Social login (Google, etc.) | [ ] | 1b | OAuth — deferred |

| Add vehicle via VIN lookup | [x] | 1b | NHTSA VPIC decode API |

| Add vehicle manual (make/model/year) | [x] | 1 | Done |

| Multi-vehicle per account | [x] | 1 | Done |

| **3 free vehicles, paid beyond** | [x] | 1b | Enforced on `POST /vehicles` |



### Events



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Pre-defined event types + custom | [x] | 1 | Fixed list in UI; custom type TBD |

| Mileage, date, garage, notes | [x] | 1 | Done |

| Upload receipts / photos (PDF, JPEG, PNG) | [x] | 1 | Multer + local storage |

| **Automatic OCR** extraction | [x] | 4 | Tesseract + pdf-parse on upload |

| Owner self-reported proof-backed events | [x] | 6 | Owner-created events stay unverified; proof upload only |



### Shops



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Repair shop accounts (role SHOP) | [x] | 2 | `/api/auth/register/shop` |

| Shop portal / dashboard | [x] | 6 | `/shop` create verified records, pending review, history |

| Verify maintenance event | [x] | 2 | Existing owner reports can still be verified by shops |

| Shop-created verified service records | [x] | 6 | Shops create records by owner email + vehicle lookup; auto-verified |

| Upload verification proof | [x] | 2 | Optional proof file on verify |

| **Notify owner** when shop verifies | [x] | 2 | `Notification` + bell UI |



### Timeline



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| List view of events | [x] | 1 | Chronological timeline |

| **Calendar view** | [ ] | 6 | Month grid per vehicle |

| Filter by date, mileage, type | [x] | 1 | Query params on API |



### Badge SDK



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Static / animated embed widget | [x] | 3 | `/badge/embed.js` |

| On-click modal with history | [x] | 3 | Modal + link to full history |

| Visibility rules (public / private / partner) | [x] | 3 | UI on share page + partner key header |

| Generate Trust Badge | [x] | 3 | `Badge` entity + embed code |



### Privacy



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Granular sharing (all / mileage+date / none) | [x] | 3 | FULL / SUMMARY / NONE on share page |

| E2E encryption for uploaded files | [ ] | 6 | Encrypt at rest before storage |

| GDPR / CCPA compliance framework | [ ] | 6 | Export/delete account; privacy policy |



### Reminders



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Service due alerts (mileage / time) | [x] | 4 | `ServiceReminder` + hourly job |

| Shop-initiated appointment reminders | [x] | 4 | `POST /api/shop/reminders` |

| Email / SMS push | [x] | 4 | Nodemailer (console if no SMTP) |

| AI suggestions during event capture | [x] | 4 | Rule-based `/suggestions` |



### Analytics



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Owner dashboard (cost, frequency, upcoming) | [x] | 4 | `/analytics` owner |

| Shop dashboard analytics | [x] | 4 | `/analytics` shop |

| Badge metrics for partners (clicks, conversion) | [x] | 5 | `BadgeEvent` + `/api/partners/badge-analytics` |

| Anonymized OEM / insurer data feeds | [x] | 5 | `/api/insurance/reliability` |



### Partners & monetization (PDF)



| Feature (PDF) | Status | Phase | Notes |

|---------------|--------|-------|-------|

| Featured repair shop ads | [x] | 5 | `FeaturedShopAd` + `/shops` UI |

| Parts marketplace widget | [x] | 5 | `SparePart` + `/marketplace` |

| Buyer: view public vehicle history | [x] | 3 | `/history/:token` + buyer portal |

| Admin: users, shops, fraud moderation | [x] | 5 | `/admin` + ban/flag/reports |

| Help: FAQ, chat, community | [ ] | 6 | Support section |



---



## Next steps (do in this order)



### Step A — Finish Core gaps (1b) — *done*



1. [x] Enforce **max 3 vehicles** on free accounts

2. [x] **VIN decode API** (NHTSA VPIC)

3. [ ] Social login — defer unless required by course



### Step B — Shops (Phase 2) — *done*



4. [x] Shop profile fields on User (`shopName`, `address`, `shopVerified`)

5. [x] Shop register/login + `/api/shop/*` routes

6. [x] `Verification` model linked to event + shop

7. [x] Shop UI: pending events, verify + proof

8. [x] `Notification` when event verified → owner inbox



### Step C — Sharing & badge (Phase 3) — *done*



9. [x] Vehicle visibility UI (PUBLIC / PRIVATE / PARTNER_ONLY)

10. [x] Share link / token for public history

11. [x] `Badge` + embed code generator

12. [x] Minimal **Badge SDK** (script tag + modal)

13. [x] Buyer read-only public history page



### Step D — Events automation (Phase 4) — *done*



14. [x] OCR pipeline on document upload

15. [x] `ServiceReminder` + hourly due check

16. [x] Owner & shop analytics dashboards

17. [x] Email notifications (verify, reminders)



### Step E — Partners & polish (Phase 5–6)



18. [x] Featured shops + parts marketplace widgets

19. [ ] Calendar timeline view

20. [ ] File encryption, GDPR export/delete

21. [x] Admin panel

22. [x] Shop-first verified maintenance flow (shop creates auto-verified records; owner entries stay self-reported)

23. [x] Trust-focused UI/UX polish for shop portal, owner timeline, public history, analytics



---



## Phase checklist (summary)



| Phase | Name | Status |

|-------|------|--------|

| 1 | Core MVP | **Done** |

| 1b | Core gaps (limits, VIN API) | **Done** |

| 2 | Trust layer (shops) | **Done** |

| 3 | Sharing & badge SDK | **Done** |

| 4 | OCR, reminders, analytics | **Done** |

| 5 | Partners & monetization | **Done** |

| 6 | Privacy, calendar, support | **In progress** |



---



## Reference docs



- `Main idea.pdf` — product vision & features

- `diagramme_classe.png` — class diagram

- `use_case.png` — use case diagram



---



## Changelog



| Date | Change |

|------|--------|

| 2026-05-21 | Phase 1 core shipped (auth, vehicles, events, uploads, timeline, filters) |

| 2026-05-21 | Tracker aligned to PDF feature map; next steps A→E defined |

| 2026-05-21 | Phase 1b: 3-vehicle limit, NHTSA VIN decode |

| 2026-05-21 | Phase 2: shop register/portal, verification, notifications |

| 2026-05-21 | Phase 3: share settings, public history, Trust Badge SDK, buyer role |

| 2026-05-21 | Phase 4: OCR, reminders, analytics, email, AI suggestions |

| 2026-05-21 | Phase 5: featured shops, parts marketplace, badge/insurance partner APIs, admin moderation |

| 2026-05-24 | Shop-first verified maintenance workflow: shop-created records auto-verify; owner records remain proof-backed self-reports |


