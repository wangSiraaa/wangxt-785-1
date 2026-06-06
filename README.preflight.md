# Trae Preflight

This folder is prepared for `wangxt-785-1`.

Use `.env` for stable local ports and compose project identity:

- APP_PORT: 18085
- API_PORT: 19085
- WEB_PORT: 20085
- DB_PORT: 21085
- REDIS_PORT: 22085

Smoke entry:

```bash
bash scripts/smoke.sh
```

The preflight files are environment scaffolding only. The generated business
project can replace or extend them when needed.
