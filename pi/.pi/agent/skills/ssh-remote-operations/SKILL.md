---
name: ssh-remote-operations
description: Routes SSH and remote-system work safely. Use whenever a task connects to an internal or remote system through SSH, including SSH commands, tunnels, port forwarding, SCP, SFTP, rsync over SSH, remote service administration, remote logs, remote deployments, and SSH configuration or keys used for such access.
---

# SSH and remote operations

Delegate every operation involving SSH or a system reached through SSH to the
`tech_operator` subagent. Do not run SSH, SCP, SFTP, SSH-backed rsync, tunnels,
or remote commands directly in the primary agent or through any other
subagent.

## Routing

1. Separate SSH or remote-system work from local work.
2. Give `tech_operator` a narrow task that names the approved host or alias,
   exact goal, relevant paths or services, and permitted validation.
3. Delegate non-SSH work to `worker`. Use `explore` only for read-only local
   repository discovery.
4. If one request mixes local and SSH work, send each part to the correct
   agent. Do not let `worker` or `explore` perform the SSH portion.
5. Review the operator's result. Do not personally retry failed remote commands.
   Send a new, tightly scoped task to `tech_operator` if more SSH work is
   required.

## Safety and scope

`tech_operator` must stay within the prompt's exact scope and must never take
extremely disruptive actions. Do not delegate disk wipes or reformats, broad
data deletion, host shutdowns or reboots, network or remote-access disabling,
broad firewall flushes, shared credential revocation, infrastructure
destruction, fork bombs, or broad process kills.

If the requested result requires one of those actions, broader access, an
unspecified target, or missing credentials, stop and report the blocker to the
user. Do not broaden the task, substitute a different host, weaken security
controls, or pursue unrelated fixes.
