# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

delegated: Node.js + Express + static HTML/CSS/JS. Local filesystem scan needs a small backend; no extra framework. *(inferred — user said produce immediately)*

## Users

A Windows user at their desk who needs to see which folders are eating a drive so they can delete, archive, or move them. *(inferred from TreeSize Free reconstruction brief)*

## Product Purpose

Massif scans a chosen local path and shows a size tree plus a treemap so the largest folders are obvious in seconds. Success is: pick a folder, get trustworthy totals, export a list.

## Positioning

A local-only disk mass reading: no account, no telemetry, no edition upsell. The mechanism is a live scan of the path you typed, not a cloud inventory.

## Operating Context

Runs on the user's machine. Paths are Windows paths. Permission-denied folders are skipped and counted, not fatal. Default start is an empty scan, not the whole C: drive.

## Capabilities and Constraints

Confirmed from the reconstruction brief (observed TreeSize Free behavior, reimplemented — not their code or marks):

- Scan a user-chosen directory
- Tree of name, size, percent, file count, folder count
- Sort those columns
- Hide empty folders
- Automatic or fixed size units
- Treemap of the current folder
- Export CSV and HTML
- Dark operating UI
- Stop an in-flight scan

Out of scope for this build: Explorer shell extension, SharePoint/Drive, admin elevation, crash reporter, update server, Pro features.

## Brand Commitments

Do not use TreeSize, JAM Software, or their visual marks. Product name is Massif.

## Evidence on Hand

Static observations from the installed TreeSize Free 4.8.1 binary (PE, Delphi/VCL, ribbon actions, endpoints). No original source. Demonstration data is whatever the user scans.

## Product Principles

- Local data stays local.
- Size numbers are the product; chrome stays out of the way.
- A scan you did not start never runs.
- Errors are listed, not hidden.
- Observed competitor behavior informs jobs, not identity.

## Accessibility & Inclusion

Keyboard-usable path field, scan/stop, table. Contrast suitable for a dim desk. *(inferred floor, not a legal claim)*
