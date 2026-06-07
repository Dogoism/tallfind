"""Tests for tools/validate_data.py.

Run with: pytest tools/
"""

import copy

import validate_data as vd

MEN_REQUIRED = vd.STORE_FILES["men"]["required"]
WOMEN_REQUIRED = vd.STORE_FILES["women"]["required"]


def valid_man(**overrides):
    store = {
        "name": "Test Tall Co",
        "domain": "testtall.com",
        "tallSpecific": True,
        "hasTops": True,
        "hasBottoms": True,
        "topSizes": "Tall - M-3XL",
        "inseam": 38,
        "inseamD": '38"',
        "waist": '30"-40"',
        "notes": None,
        "url": "https://www.testtall.com",
    }
    store.update(overrides)
    return store


def valid_woman(**overrides):
    store = {
        "name": "Test Tall Co",
        "domain": "testtall.com",
        "tallSpecific": True,
        "hasTops": True,
        "hasBottoms": True,
        "topSizes": "Tall - XS-XL",
        "bottomSizes": "0-18",
        "notes": None,
        "url": "https://www.testtall.com",
    }
    store.update(overrides)
    return store


def men(*stores):
    return vd.validate_stores("men", list(stores), MEN_REQUIRED)


def women(*stores):
    return vd.validate_stores("women", list(stores), WOMEN_REQUIRED)


# ── Happy path ────────────────────────────────────────────────────────────────

def test_valid_man_has_no_errors():
    assert men(valid_man()) == []


def test_valid_woman_has_no_errors():
    assert women(valid_woman()) == []


def test_real_data_passes():
    # The shipped data files must satisfy every rule.
    assert vd.validate_all() == []


# ── Structural rules ──────────────────────────────────────────────────────────

def test_non_list_is_rejected():
    errors = vd.validate_stores("men", {"not": "a list"}, MEN_REQUIRED)
    assert any("must contain a JSON list" in e for e in errors)


def test_non_object_entry_is_rejected():
    errors = vd.validate_stores("men", ["nope"], MEN_REQUIRED)
    assert any("must be an object" in e for e in errors)


# ── Existing rules ────────────────────────────────────────────────────────────

def test_duplicate_name_is_rejected():
    errors = men(valid_man(domain="a.com"), valid_man(domain="b.com"))
    assert any("duplicate store name" in e for e in errors)


def test_duplicate_domain_is_rejected():
    errors = men(valid_man(name="A"), valid_man(name="B"))
    assert any("duplicate domain" in e for e in errors)


def test_non_https_url_is_rejected():
    errors = men(valid_man(url="http://insecure.com"))
    assert any("non-HTTPS URL" in e for e in errors)


def test_missing_required_field_is_rejected():
    store = valid_man()
    del store["waist"]
    errors = men(store)
    assert any("missing required field: waist" in e for e in errors)


def test_non_bool_flag_is_rejected():
    errors = men(valid_man(tallSpecific="yes"))
    assert any("tallSpecific must be true or false" in e for e in errors)


def test_blank_name_is_rejected():
    errors = men(valid_man(name="   "))
    assert any("name cannot be blank" in e for e in errors)


def test_has_tops_false_requires_na_topsizes():
    errors = women(valid_woman(hasTops=False, topSizes="Tall - XS-XL"))
    assert any("topSizes should be N/A or None" in e for e in errors)


def test_no_tops_and_no_bottoms_is_rejected():
    errors = women(
        valid_woman(hasTops=False, hasBottoms=False, topSizes="N/A", bottomSizes="N/A")
    )
    assert any("must offer tops, bottoms, or both" in e for e in errors)


# ── New rules ─────────────────────────────────────────────────────────────────

def test_non_numeric_inseam_is_rejected():
    errors = men(valid_man(inseam="38"))
    assert any("inseam must be a number or null" in e for e in errors)


def test_null_inseam_is_allowed():
    errors = men(valid_man(inseam=None, inseamD="N/A"))
    assert errors == []


def test_bool_inseam_is_rejected():
    # bool is a subclass of int; it must not pass the numeric check.
    errors = men(valid_man(inseam=True))
    assert any("inseam must be a number or null" in e for e in errors)


def test_has_bottoms_false_requires_na_bottomsizes():
    errors = women(valid_woman(hasBottoms=False, bottomSizes="0-18"))
    assert any("bottomSizes should be N/A or None" in e for e in errors)


def test_has_bottoms_false_with_na_is_allowed():
    errors = women(valid_woman(hasBottoms=False, bottomSizes="N/A"))
    assert errors == []


def test_unknown_field_is_rejected():
    errors = men(valid_man(inseaam=38))
    assert any("unknown field: inseaam" in e for e in errors)


# ── featured.json ─────────────────────────────────────────────────────────────

def valid_featured(**overrides):
    entry = {
        "section": "Men's & Women's Pick",
        "name": "American Tall",
        "domain": "americantall.com",
        "url": "https://www.americantall.com",
        "blurb": "A broad dedicated tall range.",
    }
    entry.update(overrides)
    return entry


def test_valid_featured_has_no_errors():
    assert vd.validate_featured([valid_featured()]) == []


def test_featured_blank_field_is_rejected():
    errors = vd.validate_featured([valid_featured(blurb="  ")])
    assert any("blurb cannot be blank" in e for e in errors)


def test_featured_non_https_url_is_rejected():
    errors = vd.validate_featured([valid_featured(url="http://x.com")])
    assert any("non-HTTPS URL" in e for e in errors)


def test_featured_non_list_is_rejected():
    errors = vd.validate_featured({"not": "a list"})
    assert any("must contain a JSON list" in e for e in errors)


# ── affiliates.json ───────────────────────────────────────────────────────────

def test_empty_affiliates_is_valid():
    assert vd.validate_affiliates({}) == []


def test_valid_affiliate_entry():
    cfg = {"american-tall": {"network": "amazon", "id": "tag-20", "params": {"ref": "x"}}}
    assert vd.validate_affiliates(cfg) == []


def test_affiliate_unknown_network_is_rejected():
    errors = vd.validate_affiliates({"x": {"network": "bogus"}})
    assert any("unknown network: bogus" in e for e in errors)


def test_affiliate_bad_params_shape_is_rejected():
    errors = vd.validate_affiliates({"x": {"network": "amazon", "params": ["nope"]}})
    assert any("params must be an object" in e for e in errors)


def test_affiliate_non_object_value_is_rejected():
    errors = vd.validate_affiliates({"x": "nope"})
    assert any("must be an object" in e for e in errors)


def test_affiliates_non_object_is_rejected():
    errors = vd.validate_affiliates(["nope"])
    assert any("must contain a JSON object" in e for e in errors)


# Guard against accidental shared-state mutation between helpers.
def test_helpers_return_independent_copies():
    a = valid_man()
    b = valid_man()
    a["name"] = "Changed"
    assert b["name"] == "Test Tall Co"
    assert copy.deepcopy(a) != b
