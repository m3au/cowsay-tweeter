#!/bin/bash

###############################################################################
# ⚠️  IMPORTANT DISCLAIMER ⚠️
#
# This file is an EXAMPLE only. To use this hook, you MUST copy it to:
#
#   ~/.cursor/hooks/block-dangerous-commands.sh
#
# (or %USERPROFILE%\.cursor\hooks\block-dangerous-commands.sh on Windows)
#
# Hooks in ~/.cursor/hooks/ are GLOBAL and apply to ALL Cursor IDE projects.
# Hooks in .cursor/hooks/ (project root) are NOT executed by Cursor IDE.
#
# This file is kept in the repository as documentation and example reference.
###############################################################################

# Prevents execution of dangerous system commands (file deletion, disk formatting, permission changes)
# This hook intercepts AI assistant commands before execution and blocks dangerous operations.

# Dangerous command patterns to block (case-insensitive, handles quoted args)
DANGEROUS_PATTERNS=(
    # File deletion commands
    "rm\s+-rf\s+~/"           # rm -rf ~/
    "rm\s+-rf\s+/"            # rm -rf /
    "rm\s+-rf\s+\*"           # rm -rf * (quoted or unquoted)
    "rm\s+-rf\s+\.\./"        # rm -rf ../ (parent directory)
    # File truncation
    ">\s+[^|&]"               # > file (but allow >| for forced overwrite)
    # Disk formatting
    "mkfs\."                  # mkfs.ext4, mkfs.ntfs, etc.
    "dd\s+if=.*of=/dev/"      # dd if=... of=/dev/...
    # Permission changes
    "chmod\s+-R\s+777\s+/"    # chmod -R 777 /
    "chown\s+-R\s+.*\s+/"     # chown -R user:user /
    # System commands
    ":\(\s*\)\s*:\s*\{\s*:\|:&"  # Fork bomb
    "crontab\s+-r\s*$"       # crontab -r (end of command)
    # Unsafe pipe execution
    "wget\s+.*\s+-O-\s*\|\s*sh"  # wget ... -O- | sh
    "curl\s+.*\s+\|\s*sh"     # curl ... | sh
    # Move to dev/null (permanent deletion)
    "mv\s+.*\s+/dev/null"
)

# Get the command that would be executed (normalize whitespace)
COMMAND=$(echo "$*" | tr -s ' ')

# Normalize to lowercase for case-insensitive matching
COMMAND_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# Check against dangerous patterns
for pattern in "${DANGEROUS_PATTERNS[@]}"; do
    if echo "$COMMAND_LOWER" | grep -qE "$pattern"; then
        echo "❌ BLOCKED: Dangerous command detected" >&2
        echo "Command: $COMMAND" >&2
        echo "Pattern matched: $pattern" >&2
        exit 1
    fi
done

# Allow command to proceed
exit 0


