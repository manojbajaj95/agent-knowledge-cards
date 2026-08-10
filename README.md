

# agent-knowledge-cards

### Durable facts for coding agents, reinjected as trusted memory





---

Does your agent re-learn the same facts every session, grepping around, re-reading the README, and still missing the constraint that mattered last time.

That wastes tokens and time, and it still misses important facts.

**agent-knowledge-cards** stores durable facts as knowledge cards and reinjects them as trusted memory. The agent prefers the card over rediscovery unless the card is stale or contradicted.

---



## Quick start

```bash
npm install -g knowcards
knowcards init

knowcards propose --title "JWT auth header" --use-when auth \
  "JWTs go in the Authorization header"

knowcards query jwt
knowcards status
npx knowcards mcp
```

### MCP

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
| Propose  | Write a durable fact as a card                                           |
| Store    | One markdown file per card under `.agents/knowledge_cards/<notebook>/`   |
| Load     | Library loads into memory at process start                               |
| Retrieve | Rank cards for the current query                                         |
| Inject   | Host prepends a trusted-memory block to the prompt                       |
| Prefer   | Agent treats cards as earned memory over README/rediscovery unless STALE |


---



## Benchmarks

On Continual Learning Bench, knowledge cards beat ICL, ACE, and Mem0 in early matched runs ([PR](https://github.com/pgasawa/continual-learning-bench/pull/11)).

Harbor A/B (`repo-map`, n=3): both arms reward 1.0. With cards, cost and duration drop about 40%, input tokens about 55%:


| Metric        | with-cards | without-cards | savings   |
| ------------- | ---------- | ------------- | --------- |
| Cost (USD)    | $0.001472  | $0.002448     | **39.9%** |
| Duration (s)  | 8.773      | 14.632        | **40.0%** |
| Input tokens  | 2848       | 6395          | 55.5%     |
| Output tokens | 674        | 1242          | 45.8%     |


---



## Contributing

- **Contributing guide**: [CONTRIBUTING.md](CONTRIBUTING.md)
- **Roadmap**: [ROADMAP.md](ROADMAP.md)
- **Create an issue**: [github.com/manojbajaj95/agent-knowledge-cards/issues](https://github.com/manojbajaj95/agent-knowledge-cards/issues)



## License

MIT. See [LICENSE](LICENSE).
