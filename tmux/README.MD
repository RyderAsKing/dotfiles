# Tmux Config

## Prefix

```
Ctrl + s
```

---

## Keybindings

### Splits

| Keybinding | Action           |
| ---------- | ---------------- |
| prefix + s | Horizontal split |
| prefix + v | Vertical split   |

### Pane Navigation (Vim-style)

| Keybinding | Action     |
| ---------- | ---------- |
| prefix + h | Move left  |
| prefix + j | Move down  |
| prefix + k | Move up    |
| prefix + l | Move right |

### Window Navigation

| Keybinding      | Action          |
| --------------- | --------------- |
| prefix + H      | Previous window |
| prefix + L      | Next window     |
| prefix + Ctrl+a | Last window     |
| prefix + w      | List windows    |
| prefix + "      | Choose window   |

### Resize Panes

| Keybinding | Action       |
| ---------- | ------------ |
| prefix + , | Resize left  |
| prefix + . | Resize right |
| prefix + - | Resize down  |
| prefix + = | Resize up    |

### Rename

| Keybinding | Action                    |
| ---------- | ------------------------- |
| prefix + r | Rename window             |
| prefix + % | Rename session`tmux.conf` |

### Session

| Keybinding | Action          |
| ---------- | --------------- |
| prefix + S | Session manager |

### Misc

| Keybinding | Action            |
| ---------- | ----------------- |
| prefix + z | Toggle zoom       |
| prefix + c | Kill pane         |
| prefix + x | Swap pane         |
| prefix + R | Reload config     |
| prefix + * | Toggle sync panes |
| prefix + K | Clear screen      |
| prefix + : | Command prompt    |

---

## Notes

* Run `prefix + I` to install plugins (TPM)
* Nerd Font must be installed on your local machine
* If using `Ctrl + s`, run:

```
stty -ixon
```
