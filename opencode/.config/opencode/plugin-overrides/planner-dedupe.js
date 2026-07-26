// opencode-planner 0.3.2 injects the same reminder as both a synthetic user
// message part and a system prompt. This hook runs after the pinned planner and
// removes the lower-priority synthetic copy while retaining the system prompt.
const plannerReminderPrefix = "<system-reminder>\nPlanner mode is active."

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
  }
}
