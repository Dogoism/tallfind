#!/usr/bin/env python3
"""Validate Tallfind store data for CI and local review."""

import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

STORE_FILES = {
    "women": {
        "path": DATA_DIR / "women.json",
        "required": [
            "name",
            "domain",
            "tallSpecific",
            "hasTops",
            "hasBottoms",
            "topSizes",
            "bottomSizes",
            "notes",
            "url",
        ],
    },
    "men": {
        "path": DATA_DIR / "men.json",
        "required": [
            "name",
            "domain",
            "tallSpecific",
            "hasTops",
            "hasBottoms",
            "topSizes",
            "inseam",
            "inseamD",
            "waist",
            "notes",
            "url",
        ],
    },
}

EXTRA_JSON_FILES = [
    DATA_DIR / "featured.json",
    DATA_DIR / "affiliates.json",
]

errors = []


def load_json(path):
    with path.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def valid_https_url(value):
    parsed = urlparse(str(value or ""))
    return parsed.scheme == "https" and bool(parsed.netloc)


def add_error(message):
    errors.append(message)


def check_bool(store, field, label, index):
    if field in store and not isinstance(store[field], bool):
        add_error(f"{label}[{index}] {field} must be true or false")


def check_required_fields(store, fields, label, index):
    for field in fields:
        if field not in store:
            add_error(f"{label}[{index}] missing required field: {field}")


def check_store_file(label, path, required_fields):
    stores = load_json(path)
    if not isinstance(stores, list):
        add_error(f"{path.relative_to(ROOT)} must contain a JSON list")
        return

    names = {}
    domains = {}
    for index, store in enumerate(stores):
        if not isinstance(store, dict):
            add_error(f"{label}[{index}] must be an object")
            continue

        check_required_fields(store, required_fields, label, index)
        check_bool(store, "tallSpecific", label, index)
        check_bool(store, "hasTops", label, index)
        check_bool(store, "hasBottoms", label, index)

        name = str(store.get("name") or "").strip()
        domain = str(store.get("domain") or "").strip().lower()
        url = store.get("url")

        if not name:
            add_error(f"{label}[{index}] name cannot be blank")
        else:
            name_key = name.lower()
            if name_key in names:
                add_error(f"{label}[{index}] duplicate store name: {name}")
            names[name_key] = index

        if not domain:
            add_error(f"{label}[{index}] domain cannot be blank")
        elif domain in domains:
            add_error(f"{label}[{index}] duplicate domain: {domain}")
        domains[domain] = index

        if not valid_https_url(url):
            add_error(f"{label}[{index}] has invalid or non-HTTPS URL: {url}")

        if store.get("hasTops") is False and store.get("topSizes") not in ("N/A", "None"):
            add_error(f"{label}[{index}] hasTops is false, so topSizes should be N/A or None: {name}")

        if store.get("hasTops") is False and store.get("hasBottoms") is False:
            add_error(f"{label}[{index}] must offer tops, bottoms, or both: {name}")


for file_label, config in STORE_FILES.items():
    check_store_file(file_label, config["path"], config["required"])

for path in EXTRA_JSON_FILES:
    load_json(path)

if errors:
    print("Data validation failed:")
    for error in errors:
        print(f"- {error}")
    raise SystemExit(1)

print("Data validation passed.")
