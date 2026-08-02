"""Generate dashboard locale catalogs locally with Argos Translate.

This is a maintainer tool only. Generated JSON is committed, so RashPOD never
downloads a model or sends dashboard copy to a translation service at runtime.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import types
from pathlib import Path

os.environ.setdefault("ARGOS_CHUNK_TYPE", "MINISBD")

# Argos imports Stanza eagerly even when its lightweight packaged sentence
# splitter is selected. Avoid pulling the large Torch dependency into this
# one-off catalog task; the placeholder is never called by our selected mode.
if "stanza" not in sys.modules:
    stanza_placeholder = types.ModuleType("stanza")

    class _UnavailableStanzaPipeline:
        def __init__(self, *args: object, **kwargs: object) -> None:
            raise RuntimeError("Stanza is not used by the dashboard catalog generator")

    stanza_placeholder.Pipeline = _UnavailableStanzaPipeline  # type: ignore[attr-defined]
    sys.modules["stanza"] = stanza_placeholder

import argostranslate.package
import argostranslate.translate


REPO_ROOT = Path(__file__).resolve().parents[2]
MESSAGES_DIR = REPO_ROOT / "apps" / "rashpod-dashboard" / "messages"
TARGETS = ("ru", "fr")
SEPARATOR = "[RPDSEP9F3A]"


def source_phrases() -> list[str]:
    result = subprocess.run(
        ["node", "tools/i18n/dashboard-copy.mjs", "--list"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
        encoding="utf-8",
    )
    return [line for line in result.stdout.splitlines() if line]


def ensure_model(target: str) -> None:
    installed = argostranslate.translate.get_installed_languages()
    if any(language.code == "en" for language in installed) and any(
        language.code == target for language in installed
    ):
        return

    argostranslate.package.update_package_index()
    package = next(
        item
        for item in argostranslate.package.get_available_packages()
        if item.from_code == "en" and item.to_code == target
    )
    argostranslate.package.install_from_path(package.download())


def translate_catalog(target: str, phrases: list[str]) -> None:
    ensure_model(target)
    MESSAGES_DIR.mkdir(parents=True, exist_ok=True)
    output = MESSAGES_DIR / f"{target}.json"
    catalog = json.loads(output.read_text(encoding="utf-8")) if output.exists() else {}
    missing = [phrase for phrase in phrases if not catalog.get(phrase)]
    print(f"{target}: translating {len(missing)} missing phrases", flush=True)

    completed = 0
    cursor = 0
    while cursor < len(missing):
        batch: list[str] = []
        character_count = 0
        while cursor < len(missing) and len(batch) < 12:
            candidate = missing[cursor]
            if batch and character_count + len(candidate) > 1_000:
                break
            batch.append(candidate)
            character_count += len(candidate)
            cursor += 1

        joined = f"\n{SEPARATOR}\n".join(batch)
        translated = argostranslate.translate.translate(joined, "en", target)
        results = [item.strip() for item in translated.split(SEPARATOR)]
        if len(results) != len(batch):
            results = [argostranslate.translate.translate(item, "en", target).strip() for item in batch]

        for phrase, result in zip(batch, results):
            catalog[phrase] = result or phrase
        completed += len(batch)
        if completed % 96 == 0 or completed == len(missing):
            output.write_text(
                json.dumps(dict(sorted(catalog.items())), ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
            )
            print(f"{target}: {completed}/{len(missing)}", flush=True)


def main() -> None:
    phrases = source_phrases()
    for target in TARGETS:
        translate_catalog(target, phrases)


if __name__ == "__main__":
    main()
