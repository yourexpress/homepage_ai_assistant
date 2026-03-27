# Implementation Status

This document is no longer a forward-only historical plan. It now summarizes
the current implementation state and the most likely next improvements.

## Implemented

- bilingual knowledge loading
- reader-friendly prompt without raw internal source tags in normal answers
- session-aware chat using browser session history
- desktop-only bubble-width control
- public metrics page
- protected manager entrance
- homepage EN/ZH auto-sync through the manager flow
- visitor comments with voting, sorting, and pagination
- optional happy-personality flow with private server-side secrets
- container deployment scaffolding

## Current Architecture Decisions

- static frontend plus FastAPI backend
- file-backed homepage content
- file-backed comments
- private knowledge files mounted on the server
- in-memory operational metrics

## Good Next Steps

- replace file-backed comments/content with a shared database if multi-instance
  deployment is needed
- add real browser automation for the frontend flows
- add stronger admin authentication if the manager entrance needs broader use
- persist metrics outside process memory if long-term analytics matter
- clean remaining placeholder example content when private production data is
  ready
