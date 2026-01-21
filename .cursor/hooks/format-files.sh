#!/bin/bash

###############################################################################
# ⚠️  IMPORTANT DISCLAIMER ⚠️
#
# This file is an EXAMPLE only. To use this hook, you MUST copy it to:
#
#   ~/.cursor/hooks/format-files.sh
#
# (or %USERPROFILE%\.cursor\hooks\format-files.sh on Windows)
#
# Hooks in ~/.cursor/hooks/ are GLOBAL and apply to ALL Cursor IDE projects.
# Hooks in .cursor/hooks/ (project root) are NOT executed by Cursor IDE.
#
# This file is kept in the repository as documentation and example reference.
###############################################################################

# Processes files before AI operations
# This hook can be used to format, validate, or transform files
# before they are processed by AI assistants.

# Get the file path from command arguments
FILE_PATH="$1"

# Check if file exists
if [ ! -f "$FILE_PATH" ]; then
    echo "⚠️  File not found: $FILE_PATH"
    exit 0
fi

# Determine file type and process accordingly
if [[ "$FILE_PATH" =~ \.(md|mdx)$ ]]; then
    # Markdown files: lint and format
    # Run markdownlint if available (non-blocking)
    if command -v markdownlint &> /dev/null; then
        # Run linting but don't block on errors (just report)
        markdownlint "$FILE_PATH" 2>&1 | head -20 || true
    fi

    # Format with prettier if available
    if command -v prettier &> /dev/null; then
        prettier --write "$FILE_PATH" 2>&1 | head -20 || true
    fi
elif [[ "$FILE_PATH" =~ \.(js|jsx|ts|tsx|json|css|scss|html|yaml|yml)$ ]]; then
    # Format code files with prettier if available
    if command -v prettier &> /dev/null; then
        prettier --write "$FILE_PATH" 2>&1 | head -20 || true
    fi
fi

# Allow command to proceed
exit 0

