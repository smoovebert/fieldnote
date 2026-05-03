# Fieldnote User Manual

Fieldnote is a qualitative research workspace for organizing sources, coding evidence, refining a codebook, comparing participants, and exporting report-ready material.

This manual is written for researchers using the app. It assumes you are signed in and working inside a project.

## The Basic Workflow

Fieldnote is organized around the research loop:

1. **Overview** - choose or create a project, review project status, manage safety/backups, and open AI settings.
2. **Organize** - import and arrange sources such as interviews, documents, PDFs, DOCX files, Markdown, text, and CSV.
3. **Code** - read a source and code selected passages with one or more codes.
4. **Refine** - clean up the codebook, edit code descriptions, review references, and organize codes into a hierarchy.
5. **Classify** - create cases/participants and add attributes such as role, cohort, site, or demographic fields.
6. **Analyze** - ask structured questions of coded material, compare groups, inspect language, and export results.
7. **Report** - preview and export project memos, codebooks, excerpts, cases, and source memos.

You do not have to use every mode every time. A simple interview project might use only Organize, Code, Refine, Analyze, and Report.

## Projects

Each project contains its own sources, codes, memos, excerpts, cases, attributes, saved queries, and report settings.

New users may see a **Sample project** for orientation. Use it to explore Fieldnote without risking real research data. New projects you create yourself start blank.

### Create a Project

1. Go to **Overview**.
2. Use the project picker or project controls.
3. Create a new blank project.
4. Give it a clear name, such as `Student Access Interviews` or `Faculty Advising Study`.

### Switch Projects

Use the project list in Overview to open another project. Opening a project loads its sources, codebook, memos, excerpts, cases, and saved analysis state.

## Saving And Backups

Fieldnote autosaves to the cloud while you work. The save status appears in the app shell.

Fieldnote also keeps a local browser recovery copy so recent work can be recovered if the network drops or a tab crashes.

### Recommended Backup Habit

Before any major restructuring, download a `.fieldnote.json` backup.

Good times to download a backup:

- before deleting a project
- before merging or deleting codes
- before large imports
- before major codebook cleanup
- before schema or deployment work if you are testing the app

The backup file can be imported later as a new restored project.

## Organize Mode

Use Organize to bring material into the project and keep sources arranged.

### Import Sources

Fieldnote currently supports:

- `.txt`
- `.md`
- `.csv`
- `.docx`
- `.pdf`

Imported PDF and DOCX files are converted into readable text for coding.

PDF sources also keep page structure. In Code mode, a PDF appears as a stack of page cards. New coded excerpts from PDFs keep their page number, so citations can read like `Interview 03, p. 5`.

### Source Folders

Sources can be grouped into folders. Use folders for practical organization, such as:

- Interviews
- Follow-ups
- Fieldnotes
- Documents
- Web captures

`Internals` is protected as a default folder.

### Source Memos

A source memo is a note attached to one source. Use it for observations about that interview/document:

- interview context
- data quality notes
- first impressions
- follow-up questions
- reminders about the source

Source memos are different from the project memo. A project can have many source memos.

## Code Mode

Use Code mode for close reading.

### Code A Passage

1. Open a source.
2. Select text in the source viewer.
3. Choose one or more active codes.
4. Click **Code selection**.

The same passage can have multiple codes. This is important for qualitative analysis because one excerpt may express several themes.

### Quick Coding

The quick coding menu helps you code faster while reading. When enabled, selecting text can open contextual coding controls near the passage.

Use quick coding when you are doing a first pass through interviews and want to stay in the text.

### Instant Add Code

If you notice a new theme while coding, add a new code without leaving the coding flow. New codes can be refined later in Refine mode.

### Coding PDFs

PDFs are coded one page at a time. If a selection crosses from one page card into another, Fieldnote rejects it and asks you to reselect within a single page.

This keeps citations clean. New PDF excerpts carry a page number in search results, Refine, Analyze, Report, Word/PDF exports, and CSV/XLSX exports.

## Refine Mode

Use Refine after an initial coding pass to clean and organize the codebook.

### Edit Codes

In Refine, you can:

- rename codes
- change code color
- write or improve code descriptions
- review all excerpts attached to a code
- edit notes on coded excerpts

### Code Hierarchy

Codes can be nested under parent codes. Drag a code onto another code to nest it. Drag it back to the root level to make it top-level again.

Use hierarchy when several codes belong to a broader theme.

Example:

- Access barriers
  - Paperwork burden
  - Office hand-offs
  - Cost confusion

### Code Memos

A code memo is a note about a code or theme. Use it to define what the code means, when to use it, when not to use it, and what you are noticing across excerpts.

## Classify Mode

Use Classify to describe participants, cases, or other units of comparison.

### Cases

A case usually represents a participant, interviewee, site, institution, or document group.

Examples:

- Maria
- Participant 04
- East Campus
- Faculty advisors

Cases can be linked to sources.

### Attributes

Attributes describe cases. They are useful for comparison in Analyze mode.

Examples:

- Role = Student
- First-generation = Yes
- Site = North Campus
- Cohort = Spring 2026

Once cases and attributes exist, Analyze can compare coded themes across participant groups.

## Analyze Mode

Analyze is a question workspace. Instead of thinking of it as separate charts, think of it as asking structured questions of coded material.

The left rail is grouped by question type:

- **Evidence** - find excerpts
- **Compare** - compare codes across cases or attributes
- **Language** - inspect word frequency in filtered excerpts
- **Relationships** - inspect code co-occurrence

The right rail shows the current question in plain language, result counts, active filters, snapshots, and exports.

### Evidence: Find Excerpts

Use **Find excerpts** to retrieve coded material.

You can filter by:

- text search
- code
- case
- one or more attributes

Example questions:

- Show excerpts coded with `Access barriers`.
- Show excerpts coded with `Institutional trust` from the Maria case.
- Show excerpts mentioning `financial aid` where `First-generation = Yes`.

You can save a useful filter setup as a saved query.

### Compare: Codes By Group

Use **Codes by group** to compare code counts across cases or attribute values.

Examples:

- Which participants mention `Access barriers` most often?
- How do codes differ by role?
- Which themes appear among first-generation students compared with continuing-generation students?

Clicking a matrix cell drills back into the underlying excerpts.

### Compare: Codes By Two Attributes

Use **Codes by two attributes** to build crosstabs.

Example:

- Code counts by `Role` and `First-generation status`.

Crosstabs can show counts, row percentages, or column percentages. Clicking a cell opens the evidence behind that number.

### Language: Word Frequency

Use **Word frequency** to see common terms in the currently filtered coded excerpts.

This is most useful after applying filters. For example, filter to one code or one participant group, then inspect which words appear most often in that slice.

### Relationships: Code Co-occurrence

Use **Code co-occurrence** to see which codes appear together on the same excerpts.

This can help identify relationships between themes, such as:

- `Access barriers` often appearing with `Institutional trust`
- `Guidance` appearing with `Persistence`

### Saved Queries And Snapshots

A saved query stores the current filter setup.

A pinned snapshot captures the result list at a point in time. Use snapshots when you want to preserve what a query returned during a particular analysis pass.

This is useful for research audit trails:

- what you were seeing at the time
- which excerpts supported an interpretation
- how analysis changed later

## Report Mode

Report mode turns project material into exportable outputs.

The report preview can include:

- project memo
- codebook
- coded excerpt samples
- cases
- source memos

Use the report settings to choose which sections are included.

### Export Formats

Fieldnote supports:

- Word report (`.docx`)
- PDF report (`.pdf`)
- CSV exports
- XLSX exports

CSV/XLSX exports are useful for analysis tables and raw-data handoff. Word/PDF exports are better for readable reports.

When coded excerpts come from PDFs, reports show page citations such as `Source title, p. 3`. Spreadsheet exports include a `Page` column next to the source title.

## AI Assist

AI Assist is optional. It is designed to propose text, not write directly into project data without approval.

Current AI tools include:

- suggest codes from a selected passage
- draft a code description from coded references
- summarize a source
- draft a project memo from snapshots

AI drafts appear in a preview surface. Review them before inserting or using them.

### Hosted AI

Fieldnote can use a free hosted Gemini quota. Hosted AI has limits and requires consent because prompts may be processed by Google.

For IRB-protected or sensitive research, use your own provider key.

### Bring Your Own Key

You can use your own Gemini, OpenAI, or Anthropic key. The key is encrypted and used only inside the server-side AI function. It is not returned to the browser after saving.

## Practical Research Patterns

### First Coding Pass

1. Import interviews in Organize.
2. Open each source in Code.
3. Highlight meaningful passages.
4. Apply one or more codes.
5. Add new codes freely when patterns appear.
6. Use source memos for first impressions.

### Codebook Cleanup Pass

1. Go to Refine.
2. Review each code.
3. Rename unclear codes.
4. Add descriptions.
5. Nest related codes.
6. Merge or delete only after downloading a backup.

### Comparison Pass

1. Go to Classify.
2. Create cases and attributes.
3. Go to Analyze.
4. Use Find excerpts to check evidence.
5. Use Codes by group or Codes by two attributes to compare.
6. Click numbers to return to excerpts.

### Reporting Pass

1. Write or revise the project memo.
2. Review code descriptions.
3. Check source and code memos.
4. Go to Report.
5. Choose sections.
6. Export Word or PDF.

## Troubleshooting

### I Do Not See My Work

Check that you are signed in with the expected account and that the correct project is open.

### Autosave Looks Stuck

Do not close the tab immediately. Check your network connection. Download a `.fieldnote.json` backup if you are worried.

### A PDF Or Word Export Does Not Download

Try again once. If it still fails, use the Word export or a raw CSV/XLSX export as a temporary fallback and report the project state that caused the failure.

### AI Is Blocked

Possible reasons:

- hosted quota limit reached
- hosted AI consent not checked
- hosted kill switch is active
- BYOK provider selected but no usable key saved
- provider key is invalid or expired

Open AI settings from Overview and check the provider.

## What Is Still Coming

Fieldnote is actively evolving. Planned or partial areas include:

- richer media handling
- native PDF canvas viewing and richer DOCX preview
- audio/video transcription
- fuller collaboration/reviewer workflows
- inter-coder reliability
- more advanced AI querying
- archive-style full project exports

The current app is strongest for interview/document projects that need organizing, coding, memoing, comparison, and export.
