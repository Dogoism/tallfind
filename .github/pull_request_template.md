## Summary

Describe what changed and why.

## Store/data changes

If this PR adds or edits a store, complete this checklist:

- [ ] I verified the store website is live.
- [ ] I verified the sizing or inseam details from the brand/store website or another reliable source.
- [ ] I included source links below.
- [ ] I checked whether this is tall-specific or mainstream-with-tall-sizing.
- [ ] I checked tops/bottoms availability.
- [ ] I checked for duplicate store names/domains.

Source links:

-

## Testing

- [ ] `jq empty data/women.json data/men.json data/featured.json data/affiliates.json`
- [ ] `python tools/validate_data.py`
- [ ] `git diff --check`

## Screenshots

Add screenshots for visible UI changes.
