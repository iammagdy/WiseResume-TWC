#!/bin/bash
grep -nE "<<<<<<<|=======|>>>>>>>" CHANGELOG.md || echo "No conflicts found"