# 12 - Privacy, Data Governance & Compliance Audit

## Personal Data Inventory

VERNIQ collects and processes several categories of Personally Identifiable Information (PII) and student behavioral data:

| Data Category | Specific Data Points | Storage Location | Retention Policy | Visibility / Access |
|---|---|---|---|---|
| **Identity & Account** | Email address, hashed password, signup timestamp | `auth.users` (Supabase Auth) | Indefinite until deleted | User, Supabase internal |
| **Public Profile** | Full name, username, avatar URL, bio, GitHub/LinkedIn links | `public.profiles` (PostgreSQL) | Indefinite | Publicly readable via RLS |
| **Institutional Affiliation** | College name, college ID, graduation year | `public.profiles.college_id` | Indefinite | Public on campus leaderboards |
| **Intellectual Property / Code** | Submitted source code, custom stdin inputs | `public.submissions`, `user_codespaces` | Indefinite | Private to user (`auth.uid() = user_id`) |
| **Learning Diagnostics** | Strengths/weaknesses, quiz scores, diagnostic answers | `public.user_diagnostics`, `study_sprints` | Indefinite | Private to user |
| **Personal Study Notes** | Markdown notes attached to problems | `public.user_notes` | Indefinite | Private to user |
| **Telemetry & Metrics** | IP address, user agent, page navigation events | Vercel Web Analytics (`@vercel/analytics`) | Vercel retention window | Aggregated on Vercel dashboard |

---

## India Digital Personal Data Protection Act (DPDP Act 2023) Alignment

As an Indian learning platform targeting engineering students across states, VERNIQ is subject to the provisions of the DPDP Act 2023.

### Compliance Gap Assessment

| DPDP Act Requirement | Legal Mandate | Platform Status | Codebase Evidence & Gap Analysis |
|---|---|---|---|
| **Section 5: Notice & Consent** | Clear notice in plain language outlining data collected and processing purpose before collection | [FAIL - NONE] | Signup form (`frontend/src/routes/RegisterView.tsx`) does not present a consent checkbox or link to privacy disclosures before account creation. |
| **Section 6: Consent Architecture** | Consent must be free, specific, informed, unconditional, and unambiguous | [FAIL - NONE] | No consent records, timestamps, or opt-ins are captured or persisted in database tables. |
| **Section 11: Right to Access Information** | Students have the right to obtain a summary of their personal data and identities of third parties shared with | [FAIL - NONE] | No "Download My Data" or data export utility exists in `ProfileSettingsView.tsx` or API. |
| **Section 12: Right to Correction & Erasure** | Obligation to correct inaccurate data and erase personal data upon withdrawal of consent | [PARTIAL] | Users can update their profile information. However, there is **no account deletion workflow** or "Delete My Account" button anywhere in the platform. |
| **Section 13: Grievance Redressal** | Readily available grievance redressal mechanism and publishing of Data Protection Officer (DPO) contact details | [FAIL - NONE] | No contact email, DPO disclosure, or dispute escalation form exists. |
| **Child Data Protection (Under 18)** | Verifiable parental consent required if serving users under 18 (first/second-year B.Tech students may be 17) | [FAIL - NONE] | No age gate, birthdate collection, or parental consent mechanism is present. |

---

## Legal Documentation & Public Disclosures

A search across the entire repository confirms that **no standard legal agreements exist**:

1. **Privacy Policy (`/privacy`):** [MISSING] - No privacy policy view or route exists.
2. **Terms of Service (`/terms`):** [MISSING] - No terms of service view or route exists.
3. **Refund & Cancellation Policy (`/refunds`):** [MISSING] - Crucial prerequisite prior to integrating Razorpay or initiating paid subscriptions.
4. **Cookie & Analytics Notice:** [MISSING] - Vercel Web Analytics is active without an informative cookie banner.

---

## Recommendations for Compliance Readiness

1. **Implement Legal Pages:** Publish Markdown-backed routes for `/privacy`, `/terms`, and `/refunds` with explicit DPO contact details.
2. **Consent Gating at Signup:** Add mandatory checkbox: *"I agree to the Terms of Service and consent to the processing of my educational data under the Privacy Policy."*
3. **Self-Service Data Portability:** Implement an RPC endpoint allowing students to download a JSON archive of their solved submissions, notes, and profile history.
4. **Self-Service Account Deletion:** Implement a `delete_user_account()` RPC that triggers `supabase.auth.admin.deleteUser()`, cascading deletion across `profiles`, `submissions`, `codespaces`, and `notes`.
