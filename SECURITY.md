# Security Policy

## Supported versions

Security fixes are applied to the latest released minor line only.

| Version | Supported |
| ------- | --------- |
| 0.1.x   | yes       |

## Reporting a vulnerability

**Do not open a public issue for security problems.** Use GitHub's private
"Report a vulnerability" flow on this repository
(_Security → Advisories → Report_), or contact a maintainer directly. Please
include reproduction steps and affected versions. We aim to respond within
72 hours and will credit reporters in release notes unless you prefer to
remain anonymous.

## Security model

StoreShot is a local developer tool. Things worth knowing:

- Config files are plain JSON. StoreShot executes **no code** from them and
  never evaluates configuration as a program.
- `screenshots[].image`, `fonts.*` and `output.dir` are file paths — they
  can point anywhere the invoking user can read/write, like any CLI tool.
  Review configs from untrusted sources before running them.
- Rendering happens in a sandboxed Chromium profile with **external network
  requests aborted**; only local asset files are loaded.
- StoreShot does not make network calls during generation, telemetry is not
  collected, and no secrets are written to logs.
