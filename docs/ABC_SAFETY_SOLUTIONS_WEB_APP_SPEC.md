# ABC Safety Solutions — Online Training Platform

**Document type:** Requirements review, gap analysis, and technical specification  
**Stakeholders:** ABC Safety Solutions, Inc. (client) · Development (WaseemMirzaa)  
**Context:** Transcript review + prior technical discussions (categories, tests, certificates)

---

## 1. Executive summary

The client keeps the **existing WordPress marketing site** unchanged except for a **new navigation entry** (tab/link) that sends users to a **separate, dynamic training portal**. The portal supports **e-commerce**, **user accounts**, **slide-based courses with voice-over**, **tests**, **PDF certificates** (email delivery), **admin management**, and a **mobile app** (iOS/Android) for purchasing, taking courses, **wallet-style certificate storage**, **renewal reminders**, and **broadcast announcements**.

Initial scope: **~20 online courses**; content descriptions can mirror existing site copy under **Training and Certificates**.

---

## 2. Transcript review — agreed requirements

### 2.1 Business & UX goals

| Topic | Client / dev agreement |
|--------|-------------------------|
| Main website | **No structural overhaul**; add tab/link to external portal only. |
| Portal | Dedicated site with **e-commerce**, **auth**, **database**, **admin + customer** areas; branded (logo, company identity). |
| Course format | **PowerPoint-style decks**, **~30–60 slides**, **voice-over audio** (not emphasized as multiple separate long videos). |
| Purchase flow | User **pays**, receives access (**“key”** / entitlement), consumes course, **passes test**, receives outcome messaging. |
| Certificate | **PDF**, **auto-filled** with **learner name** (from account) and **course name**; **template supplied by client** (signature, credentials); **emailed** to user. |
| Catalog | **~20 courses** to start; **reuse** existing website course information where applicable; **card/grid layout** similar in spirit to competitors; **buy flow** replaces “registration request” style CTAs. |
| Mobile | Users **register and take courses on phone**; **certificates stored in app** for field use; **reminders** for **annual / expiring** training. |
| Notifications | **Reminders** (expiry / annual training); **optional plus**: **announcements** to all logged-in app users for new courses. |
| Commercial | **$2,500** budget agreed (transcript); **phased milestones**; **scope document** after offer acceptance; **not charging per additional course** for self-service admin adds (dev time for custom work may still apply — **recommend clarifying in writing**). |

### 2.2 Technical direction (from call)

- **Separate portal** vs bolting everything onto WordPress: chosen approach is **linked portal** for scalability (tests, certs, push, deep app integration).
- **Payments:** Stripe or equivalent discussed; client raised **processing payment on their end** — **not fully resolved** in transcript; needs explicit decision (who is merchant of record, which processor, refunds).
- **App strategy:** Avoid **WebView-only** iOS pitfalls; use **API-backed** experience with **native or hybrid screens** where policy requires; **shared backend** with web for consistent catalog, progress, certs.

---

## 3. Gap analysis — requirements to add or clarify

The following were **not fully specified** in the call but are **standard** for this product class and should be **confirmed with the client** (add to scope or explicitly defer).

### 3.1 Assessment & completion rules

- **Pass threshold** (e.g. 80%), **number of attempts**, **time limit** per attempt, **question randomization**, **review of answers** (before/after pass).
- **Prerequisite:** e.g. must mark all slides viewed or **minimum seat time** before test (if any OSHA/advisory body expects seat time — confirm with client).
- **Test authoring:** admin creates **question banks** and **links tests to courses** (aligns with earlier internal planning).

### 3.2 Certificates & compliance artifacts

- **Certificate ID** + **verification page** or **QR** (reduces forgery; competitors often show “verify”).
- **Expiration / renewal** stored per certificate type; drives **reminder** logic (client asked for reminders — needs **per-course renewal period** in admin).
- **Name on certificate:** legal name vs display name; **correction process** (admin edit + re-issue).

### 3.3 Commerce & policy

- **Refund / cancellation** policy for digital goods; **chargeback** handling.
- **Sales tax** (if US); **invoices** for B2B (not discussed — optional phase).
- **Receipts** and **order history** in user dashboard.

### 3.4 Accounts & security

- **Email verification**, **password reset**, **session security**, **rate limiting** on login/test.
- **Roles:** at minimum **admin** vs **learner**; optional **sub-admin** later.
- **GDPR/CCPA**-style privacy notice if applicable; **data retention** for attempts and PII.

### 3.5 Content & delivery

- **Progress persistence** (resume slide/audio position).
- **Bandwidth-friendly** audio; **mobile background playback** behavior (OS limits).
- **Captions / transcript** for voice-over (accessibility + some enterprise buyers expect it).
- **Course versioning** when content or test changes (what happens to in-progress learners).

### 3.6 Operations

- **Hosting** ownership and **monthly cost** estimate (client to pay provider).
- **Backups**, **monitoring**, **uptime** expectations.
- **Email deliverability** (SPF/DKIM) for certificate emails.
- **Support**: who handles learner password issues vs payment issues.

### 3.7 Mobile app specifics

- **Push notification** permissions and **opt-in** copy; **quiet hours** optional.
- **Offline mode** (optional; significant scope if required).
- **App Store** accounts: **who publishes** (client Apple/Google developer accounts recommended).

### 3.8 Clarifications from conversation

- **“Key” after purchase:** define as **license tied to user account** (no manual key codes unless client insists).
- **PHP “obsolete”:** avoid debate with client; frame as **fit-for-purpose** — portal is **modern stack**, linked from WordPress.

---

## 4. System documentation

### 4.1 High-level architecture

```
[ABC WordPress site] --link/tab--> [Training Portal - Web App]
                                        |
                    +-------------------+-------------------+
                    |                   |                   |
              [REST/GraphQL API]  [Payment Provider]   [Object Storage]
                    |                   |              (audio, PDFs, slides)
                    |                   |
              [Database]          [Webhooks]
                    |
        +-----------+-----------+
        |                       |
 [Admin dashboard]      [Learner dashboard]
        |                       |
        |                 [Email service]
        |
 [Mobile apps iOS/Android] ---- same API ----
```

### 4.2 Major modules

| Module | Description |
|--------|-------------|
| **Public marketing** | Landing, course catalog, course detail (SEO, pricing, description from existing site where applicable). |
| **Auth** | Sign up, login, password reset, profile (name for certificate). |
| **Commerce** | Cart/checkout, payment, order records, entitlement to courses. |
| **LMS-lite player** | Slide deck + synchronized or chapter-based audio; progress tracking; completion gate before test if configured. |
| **Assessment** | Test delivery, scoring, attempt history, pass/fail. |
| **Certificates** | PDF generation from template, unique ID, email, list in dashboard, sync to app wallet. |
| **Admin** | CRUD courses, categories/subcategories, media upload, test builder, orders/users view, certificate template fields, announcement campaigns, renewal metadata per course. |
| **Notifications** | Email + mobile push: renewal reminders, optional broadcast announcements. |

### 4.3 Information architecture (courses)

- **Categories / subcategories** (parent/child), **slug-based URLs**, courses assigned to **primary category** (or multi-tag if agreed).
- **Course entity (suggested fields):** title, slug, summary, long description, price, status (draft/published), category, **renewal interval** (optional), **certificate template variant**, **passing score**, **max attempts**, **estimated duration**, **slide count** (informational), assets (slide images or deck file + audio per module).

### 4.4 Core user flows (mandatory)

1. **Discovery:** WordPress → portal catalog → course detail → checkout.  
2. **Purchase:** Payment success → **immediate access** to course in **My courses**.  
3. **Learn:** Open player → progress saved → mark complete / meet gate → **start test**.  
4. **Test:** Submit → score → if pass → **generate certificate** + **email PDF** + show in **dashboard/app**; if fail → policy (retry / support).  
5. **Certificates:** List, download, **store in app**; optional **verify** URL.  
6. **Reminders:** Scheduled job checks **expiry/renewal** → email/push.  
7. **Admin:** Create/edit course, upload media, attach test, publish; view users/orders/attempts.

### 4.5 Admin capabilities (checklist)

- Manage **courses**, **categories**, **pricing**, **visibility**.  
- Upload **slide assets** and **voice-over**; ordering slides.  
- **Test builder** (questions, answers, correct keys, randomization flags).  
- **Certificate template** mapping (fields: name, course, date, cert ID, signature image).  
- **User lookup** (support): view purchases, attempts, re-send certificate email.  
- **Announcements** (title, body, deep link, send to all opted-in app users).  
- **Reporting** (minimum): completions, passes, revenue per period (scope-dependent for $2.5k budget).

### 4.6 Mobile app (scope alignment)

- **Auth** aligned with portal (same user, same entitlements via API).  
- **Catalog + purchase** (or deep link to web checkout if store policies require — **decide early**).  
- **Course player** + **test** + **certificate vault**.  
- **Push:** renewal + announcements.  
- **Parity goal** (client): what’s on web for **learning + certs** should be available on app; full marketing pages on app may be trimmed.

### 4.7 Non-functional requirements

- **Responsive** web; **HTTPS** everywhere.  
- **Accessibility** baseline for portal (keyboard, contrast, forms) — extend to player as budget allows.  
- **Audit trail** for certificate issuance and admin changes to tests (recommended).  
- **Backups** of DB and file storage.

### 4.8 Integrations

- **Payment:** Stripe (or client processor — **must be fixed in scope doc**).  
- **Email:** transactional (SendGrid, SES, etc.).  
- **Push:** FCM + APNs via backend.  
- **Hosting:** e.g. VPS/managed app platform + managed DB + S3-compatible storage (exact vendor TBD with client).

### 4.9 Out of scope (unless added later)

- Full **SCORM/xAPI** enterprise LMS.  
- **Live virtual classroom** / Zoom integration.  
- **In-person class scheduling** (separate from this portal unless merged).  
- **Multi-tenant** resellers.

---

## 5. Milestones alignment (from call)

1. **Offer accepted** → **scope document** + **milestone breakdown** + payment schedule.  
2. **Frontend prototyping** (app) — early visual milestone mentioned.  
3. **Backend / portal** development.  
4. **Integration:** payments, email, PDF, push.  
5. **UAT** with client on **~20 courses** content load.  
6. **Launch:** DNS/link from WordPress, app store submission.
  
**Note:** Server procurement and environment setup should appear as an **explicit milestone** with **client-approved hosting budget**.

---

## 6. Open decisions log (for scope sign-off)

| # | Decision | Options | Owner |
|---|-----------|---------|--------|
| 1 | Merchant of record / payment flow | Stripe on portal vs client external payment | Client + Dev |
| 2 | In-app purchase vs web checkout | Native IAP vs web payment + entitlement | Dev + App review |
| 3 | Certificate verification | Yes/No/Phase 2 | Client |
| 4 | Seat-time / slide gating before test | None / minimum time / all slides viewed | Client |
| 5 | Captions for audio | Phase 1 / Phase 2 | Client |
| 6 | Hosting vendor and monthly budget | TBD | Client |

---

## 7. Document control

- **Source:** Client–developer call transcript + follow-up technical threads.  
- **Next step:** Client review of §3 and §6; mark items **in scope** vs **phase 2** for the $2,500 baseline.

---

*End of specification*
