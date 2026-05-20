---
name: kodachi-schedule
description: Create recurring or one-time scheduled prompts through inline tags
compatibility: opencode
---

## What I do

Create a recurring or one-time schedule for the current thread by emitting a single inline `<kodachi-schedule>` tag. The tag separates the schedule timing from the task instructions so Kodachi can preserve the user's intent exactly.

## Tag format

Always put instructions in the tag body:

```html
<kodachi-schedule when="natural language time or cadence">
task instructions to run later, including any important content the user provided
</kodachi-schedule>
```

Optional timezone:

```html
<kodachi-schedule timezone="America/New_York" when="every weekday at 9am">
Summarize open TODOs and blockers.
</kodachi-schedule>
```

Attributes:

- `when`: required. Contains only the timing/cadence, such as `in 5 minutes`, `tomorrow at 9am`, `every weekday at 9am`, or `every 2 hours`.
- Tag body: required. Contains only the task/reminder instructions to execute when the schedule fires.
- `timezone`: optional IANA timezone string, such as `UTC`, `America/New_York`, or `Europe/London`.

Do not use an `instructions` attribute. Kodachi only accepts instructions from the tag body so multiline content, quotes, answers, notes, commands, URLs, and checklists are preserved.

## How to Split User Requests

When the user asks for a reminder or schedule, extract two things:

- Timing goes in `when`.
- The actual future task goes in the tag body.

Examples:

- User: `remind me in 5 minutes that you boiled the egg`
- Tag:
```html
<kodachi-schedule when="in 5 minutes">
Remind the user that I boiled the egg.
</kodachi-schedule>
```

- User: `every weekday at 9am summarize open pull requests`
- Tag:
```html
<kodachi-schedule when="every weekday at 9am">
Summarize open pull requests.
</kodachi-schedule>
```

- User: `tomorrow morning remind me to submit the report`
- Tag:
```html
<kodachi-schedule when="tomorrow morning">
Remind the user to submit the report.
</kodachi-schedule>
```

- User: `Remind me to submit the quiz in 30 seconds, these are the answers: ...`
- Tag: put `in 30 seconds` in `when`, then put the submit reminder and all answers in the body.

## Important Rules

- Include all content needed to complete the future task. If the user provides answers, notes, links, commands, or text that must be referenced later, include that material in the instructions body.
- Do not put unrelated tool output, status messages, or internal reasoning in instructions.
- Do not put schedule words in the body, such as `in 5 minutes`, `tomorrow`, `every day`, or `at 9am`.
- Do not put task instructions in `when`.
- Preserve the user's reminder meaning and pronouns as closely as possible.
- If the user says `this`, `that`, or `it`, keep enough wording in `instructions` for the scheduled run to resolve it from the original request context.
- Do not reduce a detailed reminder to a vague snippet. For example, if the user asks to be reminded to submit a quiz and includes the answers, the instructions must mention submitting the quiz and include the answers.
- For reminders, make the instruction explicit: `Remind the user that ...` or `Remind the user to ...`.
- Emit only one schedule tag per requested schedule.
- The tag is stripped from the visible Discord reply, so also send a short normal confirmation like `Will do.`.

## What Happens

1. Kodachi strips the tag from the visible message.
2. Kodachi stores `instructions` as the authoritative scheduled task text.
3. Kodachi parses `when` into either a one-time run or recurring schedule.
4. When the schedule fires, Kodachi injects the stored instructions into the scheduled prompt.

## When to Use

- Use this only when the user explicitly asks to create a schedule, reminder, recurring task, or one-time future task.
- If the user asks to list, pause, resume, remove, or edit schedules, tell them to use `/schedule` instead of creating a new tag.
- Do not create a schedule if the user is only discussing scheduling hypothetically.

## Good Examples

```html
<kodachi-schedule when="in 5 minutes">
Remind the user that I boiled the egg.
</kodachi-schedule>
```

```html
<kodachi-schedule timezone="Europe/London" when="daily at 8am">
Send standup notes.
</kodachi-schedule>
```

```html
<kodachi-schedule when="every weekday at 9:30am">
Summarize open pull requests.
</kodachi-schedule>
```

```html
<kodachi-schedule when="tomorrow afternoon">
Remind the user to call the dentist.
</kodachi-schedule>
```

Long reminder with user-provided content:

```html
<kodachi-schedule when="in 30 seconds">
Remind the user to submit the quiz. Include these answers in the reminder:

- Configuration management can influence routing decisions by modifying BGP path attributes.
- Running configuration directly influences routing protocols, thereby affecting RIB and FIB updates.
- Replay Attack.
- Digital signatures provide non-repudiation, while MAC does not.
</kodachi-schedule>
```

## Bad Examples

Do not combine timing and task in one field:

```html
<kodachi-schedule when="in 5 minutes remind me to stretch">
</kodachi-schedule>
```

Do not put timing in instructions:

```html
<kodachi-schedule when="in 5 minutes">
In 5 minutes remind the user to stretch.
</kodachi-schedule>
```

Do not reference vague previous text without extracting the intent:

```html
<kodachi-schedule when="every day">
Do the above.
</kodachi-schedule>
```

Do not omit user-provided material needed later:

```html
<kodachi-schedule when="in 30 seconds">
Remind the user to submit the quiz.
</kodachi-schedule>
```

If the user included quiz answers, include the answers in the body.

Do not emit body-style tags without `when`:

```html
<kodachi-schedule>every day at 9am summarize TODOs</kodachi-schedule>
```
