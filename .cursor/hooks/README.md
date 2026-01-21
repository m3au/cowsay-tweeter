# Cursor IDE Hooks

These hooks intercept and process AI assistant commands before execution. They provide safety checks and command transformations.

## Installation

These hooks must be **copied to your global Cursor configuration** to be active:

```bash
mkdir -p ~/.cursor/hooks/
cp .cursor/hooks/*.sh ~/.cursor/hooks/
chmod +x ~/.cursor/hooks/*.sh
```

**Important:** Hooks in `.cursor/hooks/` (project root) are **example files only** and are **NOT executed** by Cursor IDE. They must be in `~/.cursor/hooks/` to work.

## Hook Configuration

Create or update `~/.cursor/hooks.json`:

```json
{
  "version": 1,
  "hooks": {
    "beforeShellExecution": [
      {
        "command": "./hooks/block-dangerous-commands.sh"
      },
      {
        "command": "./hooks/validate-paths.sh"
      },
      {
        "command": "./hooks/transform-commands.sh"
      }
    ],
    "afterFileEdit": [
      {
        "command": "./hooks/format-files.sh"
      }
    ]
  }
}
```

## Available Hooks

### `block-dangerous-commands.sh`

**Purpose:** Blocks dangerous system commands (file deletion, disk formatting, permission changes)

**Blocks:**

- `rm -rf ~/`, `rm -rf /`, `rm -rf *`
- `> file` (file truncation)
- `mkfs.*` (disk formatting)
- `dd if=... of=/dev/...` (disk operations)
- `chmod -R 777 /`, `chown -R ... /` (dangerous permissions)
- Fork bombs, `crontab -r`, unsafe pipe execution

### `validate-paths.sh`

**Purpose:** Validates paths in commands to prefer project-relative paths

**Checks:**

- Warns about absolute paths outside project directory
- Validates dangerous variable expansions
- Checks for special characters that could expand dangerously

### `transform-commands.sh`

**Purpose:** Suggests built-in Cursor tools instead of terminal commands

**Transforms:**

- `ls` → suggests `list_dir`
- `cat` → suggests `read_file`
- `rm -rf` → suggests `delete_file`
- `> file` → suggests `write` or `search_replace`

### `format-files.sh`

**Purpose:** Formats files before AI operations

**Formats:**

- Markdown files (`.md`, `.mdx`) with markdownlint and prettier
- Code files (`.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css`, `.scss`, `.html`, `.yaml`, `.yml`) with prettier

## Hook Execution Order

1. **beforeShellExecution** (blocking):

   - `block-dangerous-commands.sh` (blocks dangerous commands)
   - `validate-paths.sh` (warns about path issues)
   - `transform-commands.sh` (suggests alternatives)

2. **afterFileEdit** (non-blocking):
   - `format-files.sh` (formats files)

## Troubleshooting

**Hook not working?**

- Ensure files are in `~/.cursor/hooks/` (not `.cursor/hooks/`)
- Check file permissions: `chmod +x ~/.cursor/hooks/*.sh`
- Verify `~/.cursor/hooks.json` references correct file names
- Check Cursor IDE settings for hook configuration

**Note:** If `~/.cursor/hooks.json` references `format-markdown.sh`, update it to `format-files.sh`.
