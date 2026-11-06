# Changelog

All notable changes to the CareMate marketing website are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
via `package.json` (`caremate-website`).

Versions independently of mobile and the portals. Prefer git tags like `website-v0.1.0`.

## [Unreleased]

<!-- Add entries here as they merge to main; move into a version section at release. -->

## [0.1.0] — 2026-11-06

Initial documented baseline for the public marketing site.

### Added

#### Marketing & guides
- Patient welcome home (`/`) with CareMate for providers section
- Docs hub and guides: patient, community, providers (`/docs/*`)
- CareMate Community Network marketing (`/ccn`)
- Provider marketing (`/providers`)
- Security / trust summary (`/security`)

#### Learn (public)
- Evergreen article categories, lists, and canonical detail routes (`/articles…`)
- Legacy `/articles/:id` redirects to category/slug

#### Legal & account
- Privacy, terms, and refunds pages
- Delete-account instructions (Play Data safety URL support)

#### SEO / discovery
- Generated `robots.txt`, `sitemap.xml`, and `llms.txt`
- Per-route meta, Open Graph, and JSON-LD via `DocumentMeta`

[0.1.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/website-v0.1.0
