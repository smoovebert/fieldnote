# Sending feedback on the Fieldnote alpha

Thanks for testing. The product is in active alpha — bugs and rough edges are expected, and your specific examples are how we figure out what to fix first.

**Where to send feedback:** [studio.ops@behemothagency.com](mailto:studio.ops@behemothagency.com)

## Feedback that's easy to act on

The most useful reports include four things. Subject line, the four things, send. No need to be exhaustive — even one well-described issue is more useful than a long list of "it felt off."

### 1. What you were trying to do

A sentence about the goal, in your own words. *"I was trying to code interview 03 with two overlapping codes,"* not *"I was using Code mode."*

### 2. What you expected to happen

What would have felt right? *"I expected both codes to apply to the same selection,"* or *"I expected the snapshot to show up in the Report immediately."*

### 3. What actually happened

Be specific about where things broke down. *"Only the second code applied; the first one disappeared from the Active Codes list,"* or *"The snapshot appeared but the Report still said 'No analysis snapshots yet.'"* Screenshots help — drag-into-email is fine.

### 4. Where you were

Which mode (Overview / Organize / Code / Refine / Classify / Analyze / Report), which project, what browser. The version string at the bottom of the page (if visible) helps us match against a specific deploy.

## Categories that are especially useful right now

Not required, but if your feedback fits one of these we know how to route it faster:

- **Coding flow friction.** Anything that slowed you down while doing the actual reading-and-coding work — the inner loop of every research project.
- **Citation accuracy.** If "Source, p. 5" doesn't match what's actually on page 5 of your PDF, that's a serious bug. Tell us.
- **AI assist outputs.** When suggested codes / drafted descriptions / summaries / project-memo drafts felt wrong, off-tone, or invented things that weren't in the source. Especially important for the free Gemini Flash path — quality issues there are why we're keeping the BYOK option visible.
- **Report exports.** PDF and Word should read like work products. If they look amateur, broken, or wrong in a way you'd be embarrassed to share with a committee — that matters.
- **Lost work.** If autosave failed, a snapshot vanished, a project deleted unexpectedly, or anything you typed didn't persist after a refresh. Highest priority class.
- **Confusing UI.** Anywhere you stared at the screen for a second to figure out what to do next. We can fix what we can name.

## Categories you probably don't need to flag

These are deliberately not built yet — sending feedback about them is fine but won't change the timeline:

- Audio / video / image sources
- Real-time multi-user collaboration
- Native PDF rendering (we currently render extracted text + page anchors)
- "Ask your data" / chat-with-corpus
- Mobile / tablet (the app gates at 1024px on purpose)

The full open-thread list lives in `handoff.md` under "Required Next Step."

## What happens with your feedback

Every email is read. Recurring themes get folded into the roadmap (visible in `handoff.md`). Specific bugs get fixed in the next development cycle. We don't always reply individually — that's not a sign your feedback was ignored. We will reply if we need more detail to reproduce something.

## Privacy reminder

If your feedback includes screenshots that show real interview content, identifying details, or anything covered by your IRB protocol — please redact before sending. We don't need verbatim quotes to reproduce most issues. The `studio.ops@` inbox is not encrypted end-to-end.

## Account questions

For account deletion, password reset, billing (no billing exists yet during alpha), or "I can't sign in":

- **Account deletion** is now self-serve: Overview → right-rail Account panel → "Delete account…". Email us if the in-app flow ever fails.
- **Password reset** is via Supabase Auth's standard flow on the sign-in screen.
- **Sign-in trouble** — usually a service-worker / cached-bundle issue. Hard refresh (Cmd+Shift+R) or try in a fresh browser profile first; email us if that doesn't fix it.

Thanks again for testing.
