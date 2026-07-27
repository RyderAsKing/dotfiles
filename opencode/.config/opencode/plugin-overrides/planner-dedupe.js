import { access } from "node:fs/promises"

// opencode-planner 0.3.2 injects the same reminder as both a synthetic user
// message part and a system prompt. This hook runs after the pinned planner and
// removes the lower-priority synthetic copy while retaining the system prompt.
const plannerReminderPrefix = "<system-reminder>\nPlanner mode is active."
const planRoot = ".opencode/plans"

export default async function plannerDedupe() {
  return {
    async "chat.message"(_input, output) {
      output.parts = output.parts.filter(
        (part) =>
          !(
            part.type === "text" &&
            part.synthetic === true &&
            typeof part.text === "string" &&
            part.text.startsWith(plannerReminderPrefix)
          ),
      )
    },
    async "tool.execute.before"(input) {
      if (input.tool !== "edit_plan") return

      const target = `${planRoot}/${input.sessionID}.md`

      try {
        await access(target)
      } catch (error) {
        if (error?.code === "ENOENT") {
          throw new Error(
            `The plan file \`${target}\` does not exist yet. Write the plan before reopening it for review.`,
          )
        }

        throw error
      }
    },
  }
}
