



#!/bin/bash

# Compute "major.minor.patch" version of projet
# need a git tag with "major-minor" pattern 
# example: 
#   $ git tag 1-0  5f035c7d94803fc452963f6d6e808bfc6846d683 -m "typescript support" 
#   $ git push origin --tags
currentVersion="$(git describe)"

if [[ $currentVersion =~ ^([0-9]+\-){2,3}.*$ ]]; then
    currentVersion="$(echo -n "$currentVersion" | grep -Eo '^(v)?([0-9]+(\-|\.)[0-9]+(\-|\.)[0-9]+)' | tr '-' '.')"
elif [[ $currentVersion =~ ^[0-9]+\-[0-9]+$ ]]; then
    currentVersion="$(echo -n "$currentVersion" | tr '-' '.').0"
fi

echo "$currentVersion"