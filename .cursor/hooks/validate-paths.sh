#!/bin/bash

###############################################################################
# ⚠️  IMPORTANT DISCLAIMER ⚠️
#
# This file is an EXAMPLE only. To use this hook, you MUST copy it to:
#
#   ~/.cursor/hooks/validate-paths.sh
#
# (or %USERPROFILE%\.cursor\hooks\validate-paths.sh on Windows)
#
# Hooks in ~/.cursor/hooks/ are GLOBAL and apply to ALL Cursor IDE projects.
# Hooks in .cursor/hooks/ (project root) are NOT executed by Cursor IDE.
#
# This file is kept in the repository as documentation and example reference.
###############################################################################

# Validates paths in commands to prefer project-relative paths over absolute
# Warns about absolute paths outside the project directory

COMMAND="$*"

# Get project root (assume we're in a git repo, fallback to current dir)
PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || pwd)

# Pattern: Absolute paths outside project
if echo "$COMMAND" | grep -qE "(^|\s)(/Users/|/home/|/var/|/usr/|/etc/|C:\\)"; then
    # Check if path is within project
    ABSOLUTE_PATH=$(echo "$COMMAND" | grep -oE "(^|\s)(/Users/|/home/|/var/|/usr/|/etc/|C:\\)[^\s]*" | head -1 | tr -d ' ')
    
    if [ -n "$ABSOLUTE_PATH" ] && [[ ! "$ABSOLUTE_PATH" =~ ^$PROJECT_ROOT ]]; then
        echo "⚠️  Warning: Absolute path detected outside project directory" >&2
        echo "Command: $COMMAND" >&2
        echo "Path: $ABSOLUTE_PATH" >&2
        echo "Suggested: Use project-relative paths instead" >&2
    fi
fi

# Pattern: Dangerous variable expansion in paths
if echo "$COMMAND" | grep -qE "\$[A-Z_]+\s*[\*\+]"; then
    echo "⚠️  Warning: Unquoted variable expansion in path could be dangerous" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Quote variables and validate paths before use" >&2
fi

# Pattern: Special characters that could expand dangerously
if echo "$COMMAND" | grep -qE "[*?\[\{]"; then
    echo "⚠️  Warning: Special characters in path could expand unexpectedly" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Quote paths and validate before execution" >&2
fi

# Allow command to proceed (this is advisory only)
exit 0

