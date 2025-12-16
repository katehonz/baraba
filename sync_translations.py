#!/usr/bin/env python3
"""
Translation synchronization and validation utility for Baraba accounting system.
Helps keep frontend and backend translations consistent.
"""

import json
import os
from typing import Dict, Set, List, Tuple


def load_json_file(filepath: str) -> Dict:
    """Load and parse JSON file."""
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Error: File {filepath} not found")
        return {}
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON in {filepath}: {e}")
        return {}


def flatten_dict(d: Dict, prefix: str = "") -> Dict:
    """Flatten nested dictionary to dot notation keys."""
    result = {}
    for key, value in d.items():
        new_key = f"{prefix}.{key}" if prefix else key
        if isinstance(value, dict):
            result.update(flatten_dict(value, new_key))
        else:
            result[new_key] = value
    return result


def compare_translations(
    frontend_file: str, backend_file: str, lang: str
) -> Tuple[Set[str], Set[str], Set[str]]:
    """Compare frontend and backend translations."""
    frontend_data = load_json_file(frontend_file)
    backend_data = load_json_file(backend_file)

    frontend_flat = flatten_dict(frontend_data)
    backend_flat = flatten_dict(backend_data)

    frontend_keys = set(frontend_flat.keys())
    backend_keys = set(backend_flat.keys())

    common_keys = frontend_keys & backend_keys
    frontend_only = frontend_keys - backend_keys
    backend_only = backend_keys - frontend_keys

    return common_keys, frontend_only, backend_only


def generate_missing_translations(
    frontend_file: str, backend_file: str, lang: str
) -> Dict:
    """Generate missing translations for backend based on frontend."""
    frontend_data = load_json_file(frontend_file)
    backend_data = load_json_file(backend_file)

    frontend_flat = flatten_dict(frontend_data)
    backend_flat = flatten_dict(backend_data)

    missing_translations = {}

    for key, value in frontend_flat.items():
        if key not in backend_flat:
            missing_translations[key] = value

    return missing_translations


def validate_translation_completeness():
    """Validate that all languages have complete translations."""
    languages = ["en", "bg"]

    for lang in languages:
        print(f"\n=== Validating {lang.upper()} translations ===")

        # Frontend file
        frontend_file = f"frontend/public/locales/{lang}/translation.json"
        backend_file = f"locales/{lang}.json"

        if not os.path.exists(frontend_file):
            print(f"❌ Frontend file missing: {frontend_file}")
            continue

        if not os.path.exists(backend_file):
            print(f"❌ Backend file missing: {backend_file}")
            continue

        common_keys, frontend_only, backend_only = compare_translations(
            frontend_file, backend_file, lang
        )

        print(f"✓ Common translation keys: {len(common_keys)}")
        print(f"⚠ Frontend-only keys: {len(frontend_only)}")
        print(f"⚠ Backend-only keys: {len(backend_only)}")

        if frontend_only:
            print(f"\nKeys only in frontend (should be added to backend):")
            for key in sorted(frontend_only):
                print(f"  - {key}")

        if backend_only:
            print(f"\nKeys only in backend (should be added to frontend):")
            for key in sorted(backend_only):
                print(f"  - {key}")


def sync_backend_from_frontend():
    """Generate suggested backend translations from frontend."""
    languages = ["en", "bg"]

    for lang in languages:
        print(f"\n=== Syncing backend from frontend for {lang.upper()} ===")

        frontend_file = f"frontend/public/locales/{lang}/translation.json"
        backend_file = f"locales/{lang}.json"

        if not os.path.exists(frontend_file):
            print(f"❌ Frontend file missing: {frontend_file}")
            continue

        missing = generate_missing_translations(frontend_file, backend_file, lang)

        if missing:
            print(f"\nSuggested additions to {backend_file}:")
            for key in sorted(missing.keys()):
                print(f'  "{key}": "{missing[key]}",')

            # Option to auto-merge
            response = input(
                f"\nAuto-merge these translations to {backend_file}? (y/n): "
            )
            if response.lower() == "y":
                backend_data = load_json_file(backend_file)

                # Reconstruct nested structure from flat keys
                for flat_key, value in missing.items():
                    keys = flat_key.split(".")
                    current = backend_data

                    for k in keys[:-1]:
                        if k not in current:
                            current[k] = {}
                        current = current[k]

                    current[keys[-1]] = value

                # Write back to file
                with open(backend_file, "w", encoding="utf-8") as f:
                    json.dump(backend_data, f, ensure_ascii=False, indent=2)

                print(f"✓ Merged translations to {backend_file}")
        else:
            print("✓ No missing translations found")


def check_empty_translations():
    """Check for empty or null translation values."""
    languages = ["en", "bg"]

    for lang in languages:
        print(f"\n=== Checking empty translations for {lang.upper()} ===")

        frontend_file = f"frontend/public/locales/{lang}/translation.json"
        backend_file = f"locales/{lang}.json"

        frontend_data = load_json_file(frontend_file)
        backend_data = load_json_file(backend_file)

        frontend_flat = flatten_dict(frontend_data)
        backend_flat = flatten_dict(backend_data)

        frontend_empty = [
            k for k, v in frontend_flat.items() if not v or v.strip() == ""
        ]
        backend_empty = [k for k, v in backend_flat.items() if not v or v.strip() == ""]

        if frontend_empty:
            print(f"⚠ Empty frontend translations:")
            for key in frontend_empty:
                print(f"  - {key}")

        if backend_empty:
            print(f"⚠ Empty backend translations:")
            for key in backend_empty:
                print(f"  - {key}")


if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python sync_translations.py [validate|sync|check-empty]")
        print("  validate   - Check translation completeness")
        print(
            "  sync       - Generate and optionally merge missing backend translations"
        )
        print("  check-empty - Check for empty translation values")
        sys.exit(1)

    command = sys.argv[1]

    if command == "validate":
        validate_translation_completeness()
    elif command == "sync":
        sync_backend_from_frontend()
    elif command == "check-empty":
        check_empty_translations()
    else:
        print(f"Unknown command: {command}")
        sys.exit(1)
