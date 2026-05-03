# Fieldnote Alpha Privacy Policy

Last updated: May 3, 2026

This Privacy Policy describes what Fieldnote collects, why, where it's stored, who else touches it, and what control you have. Fieldnote is in alpha, so this policy is also in draft. Before Fieldnote is offered broadly, have counsel review this Policy alongside the Terms of Service and the actual production data flows.

If you have questions, write to **[studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)**.

## 1. Who This Policy Applies To

"Fieldnote," "we," "us," and "our" refer to the operator of the Fieldnote service. "You" means the person using Fieldnote. If you use Fieldnote on behalf of a university, research team, lab, or organization, this Policy still applies to you personally and to any data you upload.

## 2. What Information We Collect

### 2.1 Account information
- Email address you sign up with.
- Password (hashed by Supabase Auth — we never see or store the plaintext).
- Timestamp of when you accepted the alpha Terms of Service, plus the version string of the Terms you accepted (`termsAcceptedAt`, `termsVersion` — stored in Supabase auth metadata).

### 2.2 Project content you create
Everything you put into Fieldnote is stored in your projects:
- Source documents (transcripts, field notes, PDFs you import).
- Codes, codebook structure, code memos, and applied excerpts.
- Cases, attributes, and attribute values.
- Project memos, source memos, and the project description.
- Saved queries and pinned analysis snapshots (with any interpretation notes you add).

This content is yours. We use it only to operate the service for you (rendering it back, computing analyses, generating exports). We do not read your project content to develop our own products and we do not sell it.

### 2.3 AI assist usage
If you use the AI assist features:
- We log one row per AI call to `fieldnote_ai_calls` with: which kind of call (suggest codes / draft description / summarize source / draft project memo), which provider (free Gemini, BYOK Gemini, BYOK OpenAI, BYOK Anthropic), the prompt + completion token counts, an estimated cost in USD (free-tier only), and the AI's response.
- The hashed input is stored so identical re-requests can hit a cache instead of paying for a duplicate call. The cache is scoped to your account.
- Daily call counts are kept in `fieldnote_ai_usage` so the free-tier 50-calls-per-day limit can be enforced.
- One-time consent timestamp (`hosted_ai_consent_at`) is stored when you accept the free-tier disclosure that prompts may be used to improve Google's models.

### 2.4 BYOK API keys
If you provide your own OpenAI / Anthropic / Gemini API key, the key is encrypted with `pgcrypto`'s symmetric encryption inside our database, using a secret stored only as a Supabase Edge Function secret. The plaintext key is decrypted in memory only inside the AI Edge Function for the duration of a single AI call. The browser never receives the plaintext key after you submit it.

### 2.5 Operational logs
- Supabase records standard authentication events (sign-in, sign-up, password reset).
- Vercel records standard HTTP request logs for the front-end (timestamp, path, IP, user agent). These are retained per Vercel's default policy.
- We do not run any third-party analytics, advertising, or behavioral-tracking scripts on Fieldnote. There is no Google Analytics, no Segment, no Mixpanel, no PostHog, no Plausible, no Fathom.

## 3. Where Your Data Lives

- **Frontend**: served by Vercel.
- **Database, authentication, storage, AI Edge Functions**: Supabase project `ofvxesweiilycuakduff` in **AWS us-west-2** (Oregon).
- **AI calls**: when you use a free-tier AI feature, the prompt is sent to **Google Gemini** (`generativelanguage.googleapis.com`). When you use a BYOK feature, the prompt is sent to whichever provider's key you supplied (OpenAI, Anthropic, or Gemini).
- **Local recovery**: a snapshot of your active project is also stored in your browser's **IndexedDB** so you can recover from a network drop or tab crash. This data lives on your device only.

## 4. Third Parties That See Your Data

- **Supabase**: stores everything in section 2.1, 2.2, 2.3, and 2.4. Their privacy policy: <https://supabase.com/privacy>.
- **Vercel**: serves the frontend and sees the operational request logs in section 2.5. Their privacy policy: <https://vercel.com/legal/privacy-policy>.
- **Google (Gemini)**: receives the prompt content of any free-tier AI call you make, plus a small system prompt. Per Google's free-tier terms, prompts may be used to improve their models. We surface this trade-off as a one-time consent prompt before your first hosted AI call. Google's privacy policy: <https://policies.google.com/privacy>.
- **OpenAI / Anthropic / Google (BYOK)**: if you provide your own API key, prompts go to that provider under the terms of your account with them. Fieldnote does not have visibility into how those providers handle BYOK requests beyond what their published privacy policies say.

We do not share, sell, or rent your data to anyone else.

## 5. Cookies and Local Storage

- **Authentication cookie**: Supabase Auth sets a session cookie so you stay signed in. Without it, sign-in does not work.
- **IndexedDB**: holds the local project recovery snapshot described in section 3.
- We do not set any tracking cookies, advertising cookies, or third-party cookies.

## 6. Your Control

- **Export your data**: from Overview → "Download .fieldnote.json backup", you get a single-file JSON archive of the entire project (sources, codes, excerpts, memos, cases, attributes, snapshots).
- **Per-export downloads**: every Report and CSV/XLSX export pulls your data into formats you control.
- **Delete a project**: from the project switcher → trash icon → confirm. Cascades through every related row.
- **Delete your account**: send a request to **[studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)** with the email you signed up with. We will delete your account, all your projects, all AI usage logs tied to your `user_id`, and your Supabase auth record. Account-deletion happens manually during alpha; a self-serve flow is on the roadmap.
- **Withdraw AI consent**: switch to BYOK at any time from Settings → AI Assist. Once you switch, no further free-tier prompts will be sent to Google. Existing logged calls remain in the audit table; you can request their removal with the same email above.
- **Change your password**: from the Supabase auth flow surfaced in the app (forgot-password link on sign-in).

## 7. Data Retention

- **Account and project content**: retained until you delete the project or your account.
- **AI call logs**: retained until you delete the project or your account, or until 18 months after the call, whichever is sooner.
- **Operational logs** (Supabase + Vercel): retained per their default policies.
- **IndexedDB local recovery snapshot**: lives on your device until you clear browser storage; it is not synced to us.

## 8. Children

Fieldnote is intended for adult researchers (typically university or graduate-school work). It is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has signed up, contact **[studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)** and we will remove the account.

## 9. International Use

Fieldnote is operated from the United States and your data is stored in AWS us-west-2 (Oregon). If you use Fieldnote from outside the United States, your data is transferred into the United States for processing and storage. By using Fieldnote you consent to that transfer.

If you are in the EU/EEA or the UK and want to make a GDPR access, correction, or deletion request, contact **[studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)**. We will respond within 30 days.

## 10. Security

- All traffic to and from the app runs over HTTPS.
- Passwords are hashed by Supabase Auth.
- BYOK API keys are encrypted at rest with pgcrypto and never reach the browser after submission.
- AI Edge Functions run with the Supabase service role only on the server; the row-level security model on every other table scopes a user's reads to their own `user_id`.
- We are a small team operating in alpha. We do not yet maintain SOC 2, ISO 27001, or HIPAA controls. Do not upload data that requires those controls.

## 11. Changes to This Policy

We will update this policy as Fieldnote evolves. The "Last updated" date at the top of this document records when it last changed. For material changes that affect how we collect or share data, we will add an in-app notice and ask you to re-accept the alpha Terms.

## 12. Contact

Questions, requests, or concerns: **[studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)**.
