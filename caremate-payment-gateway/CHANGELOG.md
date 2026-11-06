# Changelog

All notable changes to the CareMate hosted payment checkout are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
via `package.json` (`caremate-payment-gateway`).

Versions independently of mobile and the portals. Prefer git tags like `payment-v0.1.0`.

Store IAP (Apple / Google) for mobile Premium is **out of scope** for this app.

## [Unreleased]

<!-- Add entries here as they merge to main; move into a version section at release. -->

## [0.1.0] — 2026-11-06

Initial documented baseline for the Vite + React Paystack checkout host.

### Added

#### Checkout products
- Patient Premium (`personal` / `family`, monthly / yearly, NGN / USD)
- Provider Private Care Team org checkout
- Payer Support Team org checkout

#### Flow
- Plan/query (and optional handoff) session into the host
- Catalog price display; Edge Function `create-*-checkout` calls
- Paystack redirect and `/success` verification via `verify-checkout`
- Allowlisted `return_success` / `return_cancel` deep links

[0.1.0]: https://github.com/softlyft/caremate-ecosystem/releases/tag/payment-v0.1.0
