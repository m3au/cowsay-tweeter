#!/bin/bash

###############################################################################
# ⚠️  IMPORTANT DISCLAIMER ⚠️
#
# This file is an EXAMPLE only. To use this hook, you MUST copy it to:
#
#   ~/.cursor/hooks/transform-commands.sh
#
# (or %USERPROFILE%\.cursor\hooks\transform-commands.sh on Windows)
#
# Hooks in ~/.cursor/hooks/ are GLOBAL and apply to ALL Cursor IDE projects.
# Hooks in .cursor/hooks/ (project root) are NOT executed by Cursor IDE.
#
# This file is kept in the repository as documentation and example reference.
###############################################################################

# Transforms terminal commands to prefer built-in Cursor tools
# Intercepts common terminal commands and suggests safer alternatives

COMMAND=$(echo "$*" | tr -s ' ')

# Pattern: ls [path]
if echo "$COMMAND" | grep -qE "^ls\s+"; then
    echo "⚠️  Consider using built-in tool: list_dir" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Use list_dir tool instead of ls for safer directory inspection" >&2
fi

# Pattern: cat [file] or cat [file] | ...
if echo "$COMMAND" | grep -qE "^cat\s+[^|]"; then
    echo "⚠️  Consider using built-in tool: read_file" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Use read_file tool instead of cat" >&2
fi

# Pattern: rm -rf (not already blocked by block-dangerous-commands.sh)
if echo "$COMMAND" | grep -qE "^rm\s+-rf\s+(?!~/|/|\*|\.\./)"; then
    echo "⚠️  Consider using built-in tool: delete_file" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Use delete_file tool instead of rm -rf" >&2
fi

# Pattern: > file (file truncation)
if echo "$COMMAND" | grep -qE ">\s+[^|&]"; then
    echo "⚠️  Consider using built-in tool: write or search_replace" >&2
    echo "Command: $COMMAND" >&2
    echo "Suggested: Use write or search_replace tool instead of > file truncation" >&2
fi

# Allow command to proceed (this is advisory only)
exit 0

