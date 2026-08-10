# Knowcards

### Local-first durable facts for coding agents, reinjected as trusted memory

[![npm version](https://img.shields.io/npm/v/knowcards?style=flat-square)](https://www.npmjs.com/package/knowcards)
[![npm](https://img.shields.io/npm/dm/knowcards?style=flat-square&logo=npm)](https://www.npmjs.com/package/knowcards)
[![license](https://img.shields.io/github/license/manojbajaj95/agent-knowledge-cards?style=flat-square)](LICENSE)

---

Coding agents forget between sessions. They re-grep the tree, re-read the README, and still miss the constraint that mattered last time.

That wastes tokens and wall clock. It also fails when the workspace is wrong: a misleading README beats a truth nobody wrote down.

Knowcards keeps those facts as local markdown cards and reinjects them as trusted memory. The agent prefers the card over rediscovery unless the card is stale or contradicted.

---

## Quick start

Cards live as markdown under `.agents/knowledge_cards`. Run the CLI with `npx`:

```bash
# Create .agents/knowledge_cards/default/
npx knowcards init

# Write a durable fact as a markdown card
npx knowcards propose --title "JWT auth header" --use-when auth \
  "JWTs go in the Authorization header"

# Search the local card library
npx knowcards query jwt

# Show notebook paths and card counts
npx knowcards status

# Start the MCP stdio server (for host config below)
npx knowcards mcp
```

### MCP

Point your host at the stdio server:

```json
{
  "mcpServers": {
    "knowledge-cards": {
      "command": "npx",
      "args": ["knowcards", "mcp"]
    }
  }
}
```

---

## How it works

```
init → store (markdown) → loadAll → retrieve → inject → host
         ↑
      propose
```

| Step     | What happens                                                             |
| -------- | ------------------------------------------------------------------------ |
| Propose  | Write a fact worth keeping as a card                                     |
| Store    | One markdown file per card under `.agents/knowledge_cards/<notebook>/`   |
| Load     | Full library loads into memory when the process starts                   |
| Retrieve | Rank cards for the current query                                         |
| Inject   | Host prepends a trusted-memory block to the prompt                       |
| Prefer   | Agent treats cards as earned memory over README/rediscovery unless STALE |

---

## Benchmarks

On Continual Learning Bench, knowledge cards beat ICL, ACE, and Mem0 in early matched runs ([PR](https://github.com/pgasawa/continual-learning-bench/pull/11)).

Harbor A/B on `repo-map` (n=3): both arms hit reward 1.0. With cards, cost and duration fell about 40%, input tokens about 55%:

| Metric        | with-cards | without-cards | savings |
| ------------- | ---------- | ------------- | ------- |
| Cost (USD)    | $0.001472  | $0.002448     | 39.9%   |
| Duration (s)  | 8.773      | 14.632        | 40.0%   |
| Input tokens  | 2848       | 6395          | 55.5%   |
| Output tokens | 674        | 1242          | 45.8%   |

---

## Contributing

- [CONTRIBUTING.md](CONTRIBUTING.md)
- [ROADMAP.md](ROADMAP.md)
- [Issues](https://github.com/manojbajaj95/agent-knowledge-cards/issues)

## License

MIT. See [LICENSE](LICENSE).
