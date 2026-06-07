#!/usr/bin/env python3
"""Validate Tallfind store data for CI and local review."""

import json
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"

ALLOWED_AFFILIATE_NETWORKS = {"amazon", "impact", "skimlinks", "cj"}

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

FEATURED_FILE = DATA_DIR / "featured.json"
AFFILIATES_FILE = DATA_DIR / "affiliates.json"

FEATURED_TEXT_FIELDS = ("section", "name", "domain", "blurb")


def load_json(path):
    with path.open(encoding="utf-8") as data_file:
        return json.load(data_file)


def valid_https_url(value):
    parsed = urlparse(str(value or ""))
    return parsed.scheme == "https" and bool(parsed.netloc)


def _is_number(value):
    # bool is a subclass of int; reject it so flags can't masquerade as numbers.
    return isinstance(value, int) and not isinstance(value, bool)


def _check_bool(store, field, label, index, errors):
    if field in store and not isinstance(store[field], bool):
        errors.append(f"{label}[{index}] {field} must be true or false")


def _check_required_fields(store, fields, label, index, errors):
    for field in fields:
        if field not in store:
            errors.append(f"{label}[{index}] missing required field: {field}")


def validate_stores(label, stores, required_fields):
    """Validate a parsed list of store dicts. Returns a list of error strings."""
    errors = []
    if not isinstance(stores, list):
        errors.append(f"{label} must contain a JSON list")
        return errors

    allowed = set(required_fields)
    names = {}
    domains = {}
    for index, store in enumerate(stores):
        if not isinstance(store, dict):
            errors.append(f"{label}[{index}] must be an object")
            continue

        _check_required_fields(store, required_fields, label, index, errors)
        _check_bool(store, "tallSpecific", label, index, errors)
        _check_bool(store, "hasTops", label, index, errors)
        _check_bool(store, "hasBottoms", label, index, errors)

        # Unknown-field detection catches typos like "inseaam" that would
        # otherwise pass silently and break the SPA's per-field rendering.
        for field in store:
            if field not in allowed:
                errors.append(f"{label}[{index}] unknown field: {field}")

        name = str(store.get("name") or "").strip()
        domain = str(store.get("domain") or "").strip().lower()
        url = store.get("url")

        if not name:
            errors.append(f"{label}[{index}] name cannot be blank")
        else:
            name_key = name.lower()
            if name_key in names:
                errors.append(f"{label}[{index}] duplicate store name: {name}")
            names[name_key] = index

        if not domain:
            errors.append(f"{label}[{index}] domain cannot be blank")
        elif domain in domains:
            errors.append(f"{label}[{index}] duplicate domain: {domain}")
        if domain:
            domains[domain] = index

        if not valid_https_url(url):
            errors.append(f"{label}[{index}] has invalid or non-HTTPS URL: {url}")

        if store.get("hasTops") is False and store.get("topSizes") not in ("N/A", "None"):
            errors.append(f"{label}[{index}] hasTops is false, so topSizes should be N/A or None: {name}")

        # Symmetric rule for bottoms (women carry a bottomSizes field).
        if (
            "bottomSizes" in allowed
            and store.get("hasBottoms") is False
            and store.get("bottomSizes") not in ("N/A", "None")
        ):
            errors.append(f"{label}[{index}] hasBottoms is false, so bottomSizes should be N/A or None: {name}")

        if store.get("hasTops") is False and store.get("hasBottoms") is False:
            errors.append(f"{label}[{index}] must offer tops, bottoms, or both: {name}")

        # Inseam, when present, must be numeric so the SPA's `inseam >= N`
        # comparisons behave. null is allowed (some stores don't list one).
        if "inseam" in allowed and store.get("inseam") is not None and not _is_number(store.get("inseam")):
            errors.append(f"{label}[{index}] inseam must be a number or null: {name}")

    return errors


def validate_featured(entries):
    """Validate the parsed featured.json list. Returns a list of error strings."""
    errors = []
    if not isinstance(entries, list):
        errors.append("featured.json must contain a JSON list")
        return errors

    for index, entry in enumerate(entries):
        if not isinstance(entry, dict):
            errors.append(f"featured[{index}] must be an object")
            continue
        for field in FEATURED_TEXT_FIELDS:
            if not str(entry.get(field) or "").strip():
                errors.append(f"featured[{index}] {field} cannot be blank")
        if not valid_https_url(entry.get("url")):
            errors.append(f"featured[{index}] has invalid or non-HTTPS URL: {entry.get('url')}")

    return errors


def validate_affiliates(config):
    """Validate the parsed affiliates.json object. Returns a list of error strings."""
    errors = []
    if not isinstance(config, dict):
        errors.append("affiliates.json must contain a JSON object")
        return errors

    for slug, cfg in config.items():
        if not isinstance(cfg, dict):
            errors.append(f"affiliates[{slug}] must be an object")
            continue
        network = cfg.get("network")
        if network is not None and network not in ALLOWED_AFFILIATE_NETWORKS:
            errors.append(f"affiliates[{slug}] has unknown network: {network}")
        params = cfg.get("params")
        if params is not None and not isinstance(params, dict):
            errors.append(f"affiliates[{slug}] params must be an object")

    return errors


def validate_all():
    """Load every data file and return the aggregated list of error strings."""
    errors = []
    for file_label, config in STORE_FILES.items():
        stores = load_json(config["path"])
        errors.extend(validate_stores(file_label, stores, config["required"]))
    errors.extend(validate_featured(load_json(FEATURED_FILE)))
    errors.extend(validate_affiliates(load_json(AFFILIATES_FILE)))
    return errors


def main():
    errors = validate_all()
    if errors:
        print("Data validation failed:")
        for error in errors:
            print(f"- {error}")
        raise SystemExit(1)
    print("Data validation passed.")


if __name__ == "__main__":
    main()
