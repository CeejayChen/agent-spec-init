#!/usr/bin/env python3
"""Documentation gates for repositories scaffolded by agent-spec-init.

Modes:

  doc-sync                      run every gate
  doc-quick                     run every gate that does not parse source code
  verify-agent-note-format      one gate by identifier
  verify-agent-note-classification
  verify-md-links
  verify-md-wrap
  verify-doc-budgets
  verify-export-docstrings
  --list                        print the gate identifiers

Every gate prints its own findings and the process exits 1 when any gate fails.
The script uses only the Python standard library.
"""

from __future__ import annotations

import ast
import json
import os
import re
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

ROOT = Path(__file__).resolve().parent.parent
NOTES_ROOT = ROOT / ".agents" / "notes"
BUDGETS = ROOT / "scripts" / "doc-budgets.manifest.json"

EXCLUDED_DIRS = {
    "node_modules",
    "dist",
    "build",
    ".git",
    "vendor",
    "venv",
    ".venv",
    "__pycache__",
    ".mypy_cache",
    ".pytest_cache",
}

LIFECYCLES = ("proposed", "implemented", "rejected")
CLASSES = ("architecture", "process", "testing", "feature", "bug-fix", "simplification")
ALLOWED_NOTE_ROOT_FILES = {"README.md", "AGENTS.md", "CLAUDE.md"}
NOTE_NAME = re.compile(r"^\d{4}-\d{2}-\d{2}-.+\.md$")
LINK_RE = re.compile(r"\[([^\]]*)\]\(([^)]+)\)")

REQUIRED_SECTIONS = {
    "proposed": ("## Proposal", "## Alternatives considered", "## Acceptance criteria", "## Risks"),
    "implemented": ("## Decision", "## Alternatives considered", "## Consequences"),
    "rejected": ("## Proposal",),
}
BANNED_IN_IMPLEMENTED = ("## Proposal", "## Plan", "## Migration plan", "## Acceptance criteria")
STATUS_PATTERNS = {
    "proposed": re.compile(r"^Status: proposed$"),
    "implemented": re.compile(r"^Status: implemented$"),
    "rejected": re.compile(r"^Status: rejected \u2014 .+$"),
}
GRANDFATHER_NOTE = (
    "<!-- agent-note-format: alternatives-not-recorded (pre-format Agent Note) -->"
)


@dataclass(frozen=True)
class Note:
    path: Path
    lifecycle: str
    note_class: str


@dataclass(frozen=True)
class Gate:
    identifier: str
    label: str
    run: Callable[[], list[str]]
    quick: bool


def read(path: Path) -> str:
    """Read a UTF-8 file, replacing undecodable bytes rather than crashing."""
    try:
        return path.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def relative(path: Path) -> str:
    """Repository-relative path with forward slashes."""
    try:
        return path.relative_to(ROOT).as_posix()
    except ValueError:
        return path.as_posix()


def markdown_files(include_src: bool = False) -> list[Path]:
    """Collect Markdown files, skipping dependencies, build output, and `src/`."""
    files: list[Path] = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        current = Path(dirpath)
        dirnames[:] = sorted(name for name in dirnames if name not in EXCLUDED_DIRS)
        if not include_src and "src" in current.relative_to(ROOT).parts:
            dirnames[:] = []
            continue
        for name in sorted(filenames):
            if name.endswith(".md"):
                files.append(current / name)
    return files


def exempt_line(line: str) -> bool:
    """True for lines the one-paragraph-per-line rule does not cover."""
    stripped = line.lstrip()
    return (
        stripped == ""
        or stripped.startswith("#")
        or stripped.startswith("```")
        or stripped.startswith("|")
        or stripped.startswith("- ")
        or stripped.startswith("* ")
        or re.match(r"^\d+\.\s", stripped) is not None
        or stripped.startswith(">")
        or stripped.startswith("<!--")
        or stripped.startswith("<")
    )


def check_wrap() -> list[str]:
    """Every paragraph occupies one physical line."""
    errors: list[str] = []
    for path in markdown_files():
        if ".agents/notes/archived" in relative(path):
            continue
        lines = read(path).split("\n")
        in_fence = False
        in_frontmatter = False
        frontmatter_seen = 0
        for index, line in enumerate(lines):
            if index < 5 and line.strip() == "---":
                frontmatter_seen += 1
                in_frontmatter = frontmatter_seen == 1
                if frontmatter_seen == 2:
                    in_frontmatter = False
                continue
            if in_frontmatter:
                continue
            if line.lstrip().startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            if exempt_line(line):
                continue
            if index > 0:
                previous = lines[index - 1]
                if (
                    previous.strip() != ""
                    and not exempt_line(previous)
                    and not previous.lstrip().startswith("```")
                ):
                    errors.append(
                        f"{relative(path)}:{index + 1}: wrapped paragraph "
                        "(line continues from previous). Use one physical line "
                        "per paragraph with editor soft-wrap."
                    )
    return errors


def heading_slugs(text: str) -> set[str]:
    """GitHub-style anchors for the headings in a Markdown document."""
    slugs: set[str] = set()
    for line in text.split("\n"):
        if not re.match(r"^#{1,6}\s", line):
            continue
        heading = re.sub(r"^#{1,6}\s+", "", line).lower()
        heading = re.sub(r"[^\w\s-]", "", heading)
        heading = heading.replace("_", "")
        heading = re.sub(r"\s+", "-", heading)
        heading = re.sub(r"-+", "-", heading)
        slugs.add(heading)
    return slugs


def check_links() -> list[str]:
    """Every relative link resolves and every anchor exists."""
    errors: list[str] = []
    for path in markdown_files():
        lines = read(path).split("\n")
        in_fence = False
        for index, line in enumerate(lines):
            if line.startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            for match in LINK_RE.finditer(line):
                link = match.group(2)
                if re.match(r"^[a-z]+:", link) or link.startswith("#"):
                    continue
                target_part, _, anchor = link.partition("#")
                if target_part:
                    target = (path.parent / target_part).resolve()
                else:
                    target = path.resolve()
                if not target.exists():
                    errors.append(
                        f"{relative(path)}:{index + 1}: link target not found: {link}"
                    )
                    continue
                if anchor and target.suffix == ".md" and target.is_file():
                    if anchor.lower() not in heading_slugs(read(target)):
                        errors.append(
                            f"{relative(path)}:{index + 1}: anchor #{anchor} "
                            f"not found in {relative(target)}"
                        )
    return errors


def check_budgets() -> list[str]:
    """Standing documents stay within the ceilings in the manifest."""
    if not BUDGETS.is_file():
        return [f"manifest not found: {relative(BUDGETS)}"]
    try:
        manifest = json.loads(read(BUDGETS))
    except json.JSONDecodeError as error:
        return [f"{relative(BUDGETS)}: invalid JSON ({error})"]
    if not isinstance(manifest, dict):
        return [f"{relative(BUDGETS)}: manifest must be a JSON object"]

    errors: list[str] = []
    for name, ceiling in manifest.items():
        if not isinstance(ceiling, int):
            errors.append(f"{name}: ceiling must be an integer")
            continue
        target = ROOT / name
        if not target.is_file():
            errors.append(f"{name}: file listed in manifest but not found")
            continue
        words = len(read(target).split())
        if words > ceiling:
            errors.append(f"{name}: {words} words (ceiling {ceiling}, over by {words - ceiling})")
    return errors


def collect_notes() -> tuple[list[Note], list[str]]:
    """Walk `.agents/notes/` and validate the path taxonomy."""
    notes: list[Note] = []
    errors: list[str] = []

    if not NOTES_ROOT.is_dir():
        return notes, [f"cannot read notes directory: {relative(NOTES_ROOT)}"]

    for entry in sorted(NOTES_ROOT.iterdir()):
        if entry.is_file():
            if entry.name in ALLOWED_NOTE_ROOT_FILES:
                continue
            if entry.name.endswith((".i18n.yaml", ".zh.md")):
                continue
            errors.append(f"unexpected file at notes root: {entry.name}")
            continue
        if not entry.is_dir():
            continue
        if entry.name == "archived":
            continue
        if entry.name not in LIFECYCLES:
            errors.append(f"unknown lifecycle folder: {entry.name}")
            continue

        for class_entry in sorted(entry.iterdir()):
            if class_entry.is_file():
                if class_entry.name in {"AGENTS.md", "CLAUDE.md"}:
                    continue
                errors.append(
                    f"unexpected file at lifecycle root: {entry.name}/{class_entry.name}"
                )
                continue
            if not class_entry.is_dir():
                continue
            if class_entry.name not in CLASSES:
                errors.append(
                    f"unknown class folder: {entry.name}/{class_entry.name} "
                    f"(allowed: {', '.join(CLASSES)})"
                )
                continue

            for note_file in sorted(class_entry.iterdir()):
                if not note_file.is_file():
                    continue
                if note_file.name == ".gitkeep":
                    continue
                if note_file.name.endswith((".zh.md", ".i18n.yaml")):
                    continue
                if not NOTE_NAME.match(note_file.name):
                    errors.append(
                        "filename does not match yyyy-mm-dd-*.md pattern: "
                        f"{entry.name}/{class_entry.name}/{note_file.name}"
                    )
                    continue
                notes.append(Note(note_file, entry.name, class_entry.name))

    return notes, errors


def check_note_classification() -> list[str]:
    """Every note sits in a recognised lifecycle and classification folder."""
    return collect_notes()[1]


def check_note_format() -> list[str]:
    """Every note follows the header block and body skeleton."""
    notes, errors = collect_notes()

    for note in notes:
        text = read(note.path)
        lines = text.split("\n")
        name = relative(note.path)

        if len(lines) < 4:
            errors.append(f"{name}: file too short (need at least 4 lines for header)")
            continue
        if not re.match(r"^# Agent Note: \S", lines[0]):
            errors.append(f'{name}: line 1 must be "# Agent Note: <title>"')
        if lines[1].strip() != "":
            errors.append(f"{name}: line 2 must be blank")
        if not STATUS_PATTERNS[note.lifecycle].match(lines[2]):
            errors.append(
                f"{name}: line 3 Status: line does not match the "
                f"{note.lifecycle} pattern"
            )
        if lines[3].strip() != "":
            errors.append(f"{name}: line 4 must be blank")

        status_lines = [line for line in lines if line.startswith("Status:")]
        if len(status_lines) != 1:
            errors.append(
                f"{name}: expected exactly 1 Status: line, found {len(status_lines)}"
            )

        headings: list[str] = []
        in_fence = False
        for line in lines:
            if line.startswith("```"):
                in_fence = not in_fence
                continue
            if in_fence:
                continue
            if line.startswith("## "):
                headings.append(line.strip())

        if not headings:
            errors.append(f"{name}: no H2 sections found")
            continue
        if headings[0] != "## Problem":
            errors.append(f'{name}: first H2 must be "## Problem", found "{headings[0]}"')

        for section in REQUIRED_SECTIONS[note.lifecycle]:
            if section == "## Alternatives considered":
                has_section = section in headings
                has_grandfather = GRANDFATHER_NOTE in text
                if not has_section and not has_grandfather:
                    errors.append(f'{name}: missing required section "{section}"')
                if has_section and has_grandfather:
                    errors.append(
                        f'{name}: cannot have both "{section}" and the '
                        "grandfather comment"
                    )
                continue
            if section not in headings:
                errors.append(
                    f'{name}: missing required section "{section}" for {note.lifecycle}'
                )

        if note.lifecycle == "implemented":
            for banned in BANNED_IN_IMPLEMENTED:
                if banned in headings:
                    errors.append(
                        f'{name}: banned heading "{banned}" in an implemented note'
                    )

    return errors


def python_source_files() -> list[Path]:
    """Python files under `src/`, or top-level packages when `src/` is absent."""
    source_root = ROOT / "src"
    if not source_root.is_dir():
        roots = [
            entry
            for entry in sorted(ROOT.iterdir())
            if entry.is_dir()
            and entry.name not in EXCLUDED_DIRS
            and not entry.name.startswith(".")
            and (entry / "__init__.py").is_file()
        ]
    else:
        roots = [source_root]

    files: list[Path] = []
    for root in roots:
        for dirpath, dirnames, filenames in os.walk(root):
            dirnames[:] = sorted(name for name in dirnames if name not in EXCLUDED_DIRS)
            for filename in sorted(filenames):
                if filename.endswith(".py"):
                    files.append(Path(dirpath) / filename)
    return files


def check_export_docstrings() -> list[str]:
    """Public top-level functions and classes in `src/` carry a docstring."""
    errors: list[str] = []
    for path in python_source_files():
        try:
            tree = ast.parse(read(path), filename=str(path))
        except SyntaxError as error:
            errors.append(
                f"{relative(path)}:{error.lineno}: syntax error: {error.msg}"
            )
            continue
        for node in tree.body:
            if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                continue
            if node.name.startswith("_"):
                continue
            if ast.get_docstring(node) is None:
                kind = "class" if isinstance(node, ast.ClassDef) else "function"
                errors.append(
                    f"{relative(path)}:{node.lineno}: public {kind} "
                    f"{node.name} has no docstring"
                )
    return errors


GATES: tuple[Gate, ...] = (
    Gate("verify-agent-note-format", "Agent Note format", check_note_format, True),
    Gate(
        "verify-agent-note-classification",
        "Agent Note classification",
        check_note_classification,
        True,
    ),
    Gate("verify-md-links", "Markdown links", check_links, True),
    Gate("verify-md-wrap", "Markdown wrap", check_wrap, True),
    Gate("verify-doc-budgets", "Document budgets", check_budgets, True),
    Gate("verify-export-docstrings", "Export docstrings", check_export_docstrings, False),
)

USAGE = (
    "Usage: python scripts/doc_gates.py "
    "<doc-sync|doc-quick|--list|gate-id>"
)


def selected_gates(mode: str) -> list[Gate]:
    """Resolve a CLI mode to the gates it runs."""
    if mode == "doc-sync":
        return list(GATES)
    if mode == "doc-quick":
        return [gate for gate in GATES if gate.quick]
    for gate in GATES:
        if gate.identifier == mode:
            return [gate]
    return []


def main(argv: list[str]) -> int:
    if not argv or argv[0] in {"-h", "--help"}:
        print(USAGE)
        return 2
    if argv[0] == "--list":
        for gate in GATES:
            print(gate.identifier)
        return 0

    gates = selected_gates(argv[0])
    if not gates:
        print(USAGE)
        return 2

    print("")
    print(f"Running {len(gates)} gate(s)")
    print("")

    failed = 0
    for gate in gates:
        errors = gate.run()
        if errors:
            failed += 1
            print(f"  FAIL {gate.identifier} — {len(errors)} error(s)")
            for message in errors:
                print(f"     {message}")
        else:
            print(f"  OK   {gate.identifier}")

    print("")
    if failed:
        print(f"FAILED: {failed} of {len(gates)} gate(s)")
        return 1
    print(f"PASSED: {len(gates)} gate(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
