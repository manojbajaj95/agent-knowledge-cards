# Security policy

## Supported versions

Security fixes apply to the latest version on [npm](https://www.npmjs.com/package/knowcards).

## Report a vulnerability

Do not open a public issue or pull request.

Use GitHub private vulnerability reporting:

https://github.com/manojbajaj95/agent-knowledge-cards/security/advisories/new

Include a description, steps to reproduce, affected versions, and impact.

I will acknowledge the report when I can and work with you on a fix and disclosure.

## Scope

Knowcards is a local CLI and host hooks. It writes markdown under `.agents/knowledge_cards` and fetches matching cards into the coding agent. It does not run a network service.

In scope: the published `knowcards` package (CLI, MCP, hooks) and unexpected file writes or command execution from this code.

Out of scope: Claude Code, Cursor, Codex, and other hosts. Cards that an agent writes are trusted input in your workspace.
