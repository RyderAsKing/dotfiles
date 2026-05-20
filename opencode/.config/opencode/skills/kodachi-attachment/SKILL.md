---
name: kodachi-attachment
description: Deliver files to the Discord user as attachments through the Kodachi bridge
compatibility: opencode
---

## What I do

Attach files to your response so the Kodachi bridge uploads them to Discord alongside your message.

## How to use

Include a `<kodachi-attachment>` tag anywhere in your response:

```
<kodachi-attachment path="path/relative/to/project" />
```

The tag is stripped from the visible message before it reaches Discord. The referenced file is uploaded as a Discord attachment.

## Rules

- Path must be relative to the project root, or absolute and inside the project root
- Only tag files you explicitly want to hand off — do not tag every file you touch
- Multiple tags in one response are fine; each becomes a separate attachment
