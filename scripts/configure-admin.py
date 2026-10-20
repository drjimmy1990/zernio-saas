#!/usr/bin/env python3
"""Configure the deployment's administrator login without printing credentials."""

import getpass
import json
import os
from pathlib import Path
import re
import secrets
import sys
import tempfile
import warnings


KEYS = ("ADMIN_EMAIL", "ADMIN_PASSWORD", "SESSION_SECRET")
SETTING_LINES = re.compile(
    r"(?m)^[ \t]*(?:export[ \t]+)?(?:" + "|".join(KEYS) + r")[ \t]*=.*(?:\n|$)"
)


def compose_value(value):
    # Compose expands dollars in double-quoted values; $$ preserves a literal $.
    return json.dumps(value, ensure_ascii=False).replace("$", "$$")


def write_private(path, content):
    descriptor, temporary = tempfile.mkstemp(prefix=".env.setup-", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as stream:
            stream.write(content)
        os.chmod(temporary, 0o600)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def configure(root, email, password):
    env = root / ".env"
    if not env.is_file():
        raise ValueError(".env was not found. Run this from the deployed repository.")
    email = email.strip().lower()
    if len(email) > 254 or not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", email):
        raise ValueError("Enter a valid administrator email address.")
    if not 16 <= len(password) <= 200 or not password.strip():
        raise ValueError("Use a unique administrator password between 16 and 200 characters.")
    if password in ("AdminPassword2026!", "AnyPasswordForAdmin!"):
        raise ValueError("Choose a unique password instead of a sample password.")
    if any(ord(character) < 32 or ord(character) == 127 for character in email + password):
        raise ValueError("The email and password cannot contain control characters.")

    values = dict(zip(KEYS, (email, password, secrets.token_hex(32))))
    updates = []
    for file in (env, root / ".env.local"):
        if not file.is_file():
            continue
        original = file.read_text(encoding="utf-8")
        for match in SETTING_LINES.finditer(original):
            value = match.group().split("=", 1)[1].strip()
            if value.startswith(("'", '"')) and not re.fullmatch(
                r"""'(?:\\.|[^'\\])*'[ \t]*(?:#.*)?|"(?:\\.|[^"\\])*"[ \t]*(?:#.*)?""",
                value,
            ):
                raise ValueError(
                    file.name + " has a multiline or unfinished administrator setting. "
                    "Use single-line values before running setup. No settings were changed."
                )
        updated = SETTING_LINES.sub("", original)
        if file == env:
            updated = updated.rstrip("\n") + "\n" + "".join(
                name + "=" + compose_value(value) + "\n" for name, value in values.items()
            )
        if updated != original:
            updates.append((file, updated))
    for file, content in updates:
        write_private(file, content)


def main():
    if not sys.stdin.isatty() or not sys.stderr.isatty():
        raise ValueError("Run this script directly in the server terminal; do not pipe credentials.")
    root = Path(__file__).resolve().parent.parent
    if not (root / ".env").is_file():
        raise ValueError("Create the production .env before configuring administrator access.")
    warnings.simplefilter("error", getpass.GetPassWarning)
    print("Set the administrator login. Password typing will be hidden.")
    print("This also replaces the session secret; existing browser sessions will need to sign in again.")
    email = input("Administrator email: ")
    password = getpass.getpass("Administrator password (16+ characters): ")
    if password != getpass.getpass("Repeat administrator password: "):
        raise ValueError("Passwords did not match. No settings were changed.")
    configure(root, email, password)
    print("Saved administrator login and session secret. No passwords or secrets were displayed.")
    print("Provider credentials and the worker secret were preserved. Recreate both containers next.")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        print("Setup failed: " + str(error), file=sys.stderr)
        sys.exit(1)
    except (EOFError, KeyboardInterrupt):
        print("\nSetup cancelled. Check configuration before restarting containers.", file=sys.stderr)
        sys.exit(1)
    except getpass.GetPassWarning:
        print("Setup stopped: this terminal cannot hide password typing. Use an interactive SSH terminal.", file=sys.stderr)
        sys.exit(1)
