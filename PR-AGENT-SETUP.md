# PR-Agent setup — lessons + operational guide

A record of what we learned configuring [Qodo PR-Agent](https://github.com/qodo-ai/pr-agent)
(self-hosted via GitHub Actions, not the hosted app) for this repo. The goal:
**advisory** code review on every PR — free-first, no merge gate, workflow stays
green on LLM failure — with the rate-limit pressure split across two independent
providers so the free tiers don't collapse under PR-Agent's parallel burst.

Read this before touching `.github/workflows/pr_agent.yml`. Every setting there
exists because something below broke without it.

---

## 1. The tier system (which model powers which command)

PR-Agent has three model tiers, set via env vars on the action step:

| Env var | Tier | Powers | Fallback applied? |
|---|---|---|---|
| `config.model` | regular (heavy) | `/review`, `/improve` | yes |
| `config.model_weak` | weak (light) | `/describe`, `/ask`, line questions, `/update_changelog` | yes |
| `config.model_reasoning` | reasoning | `/improve` self-reflection step | yes |

Rules:
- `config.fallback_models` applies to **all three tiers**. It is a JSON array
  string, e.g. `'["openrouter/free","openrouter/anthropic/claude-haiku-4.5"]'`.
- If `model_weak` is **unset**, the weak tier falls back to the main `model`.
  Setting `model_weak` is what lets you offload describe to a different provider.
- **Fallback fires on ERROR only.** A free model that succeeds with a weak
  review is kept — there is no quality escalation to a paid model. Acceptable
  here because review is advisory, not a gate.

Source of truth: `pr_agent/algo/utils.py` → `get_model(model_type)`, and
[discussion #2214](https://github.com/The-PR-Agent/pr-agent/discussions/2214).

---

## 2. Trigger semantics — the gotcha that wasted a full debugging cycle

**Which workflow file a run uses depends on the event, not on which branch you
intended to test.**

| Event | Workflow file used | Config you're testing |
|---|---|---|
| `pull_request` (opened, reopened, ready_for_review, synchronize) | **the PR HEAD's** workflow file | the PR branch's config |
| `issue_comment` (e.g. commenting `/describe`) | **the DEFAULT branch's** (main) workflow file | **main's** config |

**Mistake we made:** commented `/describe` on the PR to test the new Ollama
config. The run used **main's** old config (`openrouter/free`, `auto_improve:
true`), not the PR branch's Ollama config. The test was invalid and the result
misleading.

**Fix:** to test a PR branch's `pr_agent.yml`, trigger a `pull_request` event,
never an `issue_comment`. Two cheap ways:
- Push a commit to the PR branch → `synchronize` event.
- Close + reopen the PR → `reopened` event.

---

## 3. `pr_actions` — which events fire the auto commands

PR-Agent's internal `pr_actions` (distinct from the workflow's `on:` list)
defaults to:

```
["opened", "reopened", "ready_for_review", "review_requested"]
```

**`synchronize` is NOT in the default.** So even though our workflow `on:`
includes `synchronize` (GitHub fires the action on every push to the PR),
PR-Agent does **not** run `auto_describe`/`auto_review` on a push by default.

Pushes are routed through a separate path:
- `github_action_config.handle_push_trigger: 'true'` enables push handling.
- `github_action_config.push_commands` (JSON array) decides what runs on push.
  Default is `["/describe", "/review"]` (notably **excluding `/improve`**).
- We set `push_commands: '["/review"]'` — push runs do review only.

**Consequence for testing the describe tier:** a synchronize run will **never**
exercise `model_weak`, because describe doesn't run on push. To test the
describe/Ollama tier you need an `opened`/`reopened`/`ready_for_review` event
(close + reopen is the cheapest). We confirmed this the hard way: a synchronize
run showed only OpenRouter predictions, no Ollama — and the cause was "describe
didn't run," not "Ollama is broken."

Source: [automations_and_usage.md](https://github.com/qodo-ai/pr-agent/blob/main/docs/docs/usage-guide/automations_and_usage.md).

---

## 4. OpenRouter specifics

### Rate limits (free tier)
- **20 RPM, account-level, one pool shared across ALL free models** — not
  per-model. PR-Agent fires review + describe (+ improve, if on) in **parallel**,
  so a single PR open can burst 3+ calls in the same second and blow the 20 RPM
  cap.
- **≥$10 credits unlocks 1000 RPD** (requests per day) and removes some free-tier
  friction. The $10 is a one-time top-up, not a subscription.
- Free has **no SLA**. Two independent rate-limit layers:
  1. Account 20 RPM global pool (OpenRouter's own).
  2. Upstream provider 429s (per-model/per-provider, e.g. Decart rate-limiting
     `glm-5.2`). These are independent of the account pool — a 429 from the
     upstream is a separate failure.

### Credits are tied to the account that owns the API key
- **Mistake we made:** the workflow's `OPENROUTER_API_KEY` pointed at the wrong
  account (org key vs personal key confusion). That account had ~$0, so every
  paid fallback 402'd with messages like *"can only afford 3059 of 64000"*.
  We initially thought PR-Agent had burned the $10. It hadn't — the key was
  pointing at an empty account.
- **Verify a key's balance:**
  ```sh
  curl https://openrouter.ai/api/v1/credits -H "Authorization: Bearer $OPENROUTER_API_KEY"
  # → {"data":{"total_credits":10,"total_usage":0}}
  ```

### Credit reservation — do not confuse these two settings
- `openrouter.max_tokens` = hard cap on **completion (output) tokens**. This is
  the value OpenRouter **reserves credits against**: `max_tokens × output_price`.
  Haiku 4.5 = $5/M out, so `4000` out → $0.02 reserved per call. Set this
  conservatively or paid fallbacks 402 on reservation.
- `config.custom_model_max_tokens` = declared **context window (input budget)**,
  NOT output reservation. Haiku 4.5 has a 200k window → `200000`. Mixing these
  up causes either 402s (output cap too high to reserve) or truncated context
  (input budget too low).

### The ladder (current)
1. `openrouter/z-ai/glm-5.2:free` — free, 256k ctx, **multi-provider** (Decart,
   Fireworks, Venice, Baseten +27). OpenRouter reroutes on a single-provider
   502, unlike anonymous free models. Tool calling + structured output. Solid
   for code review. Can still 429 on the upstream (Decart) under parallel burst.
2. `openrouter/free` — free meta-router. **Weak** — routes to an anonymous
   single-provider ("Stealth") that frequently 502s with *"Invalid URL:"*. We
   keep it as a middle rung but expect it to fail often.
3. `anthropic/claude-haiku-4.5` — paid last resort ($1/M in, $5/M out), supports
   tools. Only fires when both free rungs error. Needs the $10 balance.

---

## 5. Ollama Cloud (the describe offload)

The whole point of the split: route the **light tier** (`model_weak` → describe)
to a **different provider** with **independent rate limits**, so it doesn't add
to OpenRouter's 20 RPM burst.

- Base URL: `https://ollama.com` (set via `OLLAMA_API_BASE`).
- Auth: `OLLAMA_API_KEY` as a Bearer token.
- **litellm prefix must be `ollama_chat/`, not `ollama/`.** The `ollama_chat/`
  prefix enables Bearer auth against the hosted API; `ollama/` does not.
- Model: `gpt-oss:20b-cloud` (the lighter cloud variant). **Do not use
  `gpt-oss:120b-cloud`** — it is the level-4 "heavy" model and exhausts the free
  weekly quota fast. Describe is light work (PR summary); 20b is ample.
- Free tier limits: 1 concurrent request, resets every 5h session / 7d weekly.

Direct test (works outside the action):
```sh
curl https://ollama.com/api/chat -H "Authorization: Bearer $OLLAMA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-oss:20b-cloud","messages":[{"role":"user","content":"ping"}],"stream":false}'
```

---

## 6. Secret management — why `OLLAMA_API_KEY` showed blank

- **Org secrets do NOT automatically reach a repo.** An org-level secret must
  be explicitly scoped ("selected repos" or "all repos") or it resolves to
  **blank** in the workflow env dump. We set `OLLAMA_API_KEY` as an org secret
  first; it was blank in every run.
- **Repo secrets always work for that repo.** Moving it to a repo secret fixed
  it instantly.
- **Reading the env dump:** `OLLAMA_API_KEY: ***` (redacted) = secret **present
  and resolved**. `OLLAMA_API_KEY:` (blank) = **not reaching the workflow** —
  check org secret scoping, or use a repo secret.
- GitHub redacts secret values in logs as `***`. A redacted value is a success
  signal, not a failure.

---

## 7. Testing methodology — the reliable checklist

When you change `pr_agent.yml` and want to verify what actually happened:

1. **Pick the right trigger.** Review-tier (`config.model`) change → push a
   commit (synchronize). Describe-tier (`config.model_weak`) change → close +
   reopen the PR (reopened). Never use a comment to test a PR-branch config.
2. **Find the run:**
   ```sh
   gh run list --workflow "PR-Agent review" --limit 3 \
     --json databaseId,status,conclusion,event,headSha,createdAt
   ```
3. **Pull the log:**
   ```sh
   gh run view <id> --log > /tmp/pragent.log
   ```
4. **Confirm the env landed:** grep the env dump for `config.model`,
   `config.model_weak`, `OLLAMA_API_KEY` (expect `***`), `auto_improve`, etc.
5. **See which model actually fired:**
   ```sh
   grep -aoE 'Generating prediction with [a-zA-Z0-9_./:-]+' /tmp/pragent.log | sort | uniq -c
   ```
   This is the ground truth — not the config, the prediction lines.
6. **Confirm what posted:** check the PR —
   ```sh
   gh pr view <n> --json body --jq '.body'          # describe output appended here
   gh pr view <n> --json comments --jq '.comments[].body'  # review comment
   ```
7. **Verify the secret reaches the workflow** before declaring a provider bug.
   A blank key mimics every symptom of a broken provider config.

`gh run view --log` can truncate on long runs. The PR comments/description are
the authoritative "did it post" signal; the log's prediction lines are the
authoritative "which model" signal.

---

## 8. Mistakes log (what we hit, and the fix)

| # | Mistake | Symptom | Fix |
|---|---|---|---|
| 1 | Tested config via `/describe` comment | Run used main's old config, false result | Use a `pull_request` event (push or close/reopen), never `issue_comment` |
| 2 | `OLLAMA_API_KEY` as org secret, unscoped | Key blank in run env dump | Scope the org secret to the repo, or use a repo secret |
| 3 | Wrong OpenRouter key (org vs personal) | Paid fallback 402 *"can only afford X of Y"* | Verify the key's balance via the credits curl; put the funded account's key in the secret |
| 4 | Confused `custom_model_max_tokens` (input) with `openrouter.max_tokens` (output reservation) | 402 on reservation / truncated context | `max_tokens` = output cap (reservation); `custom_model_max_tokens` = input/context window |
| 5 | `/improve` left on | Doubled the parallel OpenRouter burst for advisory output a solo dev doesn't need | `auto_improve: 'false'`; drop `/improve` from `push_commands` |
| 6 | `gpt-oss:120b-cloud` for describe | Exhausts Ollama free weekly quota fast | `gpt-oss:20b-cloud` — light work, light model |
| 7 | Expected describe on every push | Describe never ran on synchronize runs | `pr_actions` default excludes `synchronize`; describe fires on open/reopen/ready only |
| 8 | `openrouter/free` trusted as a real fallback | Stealth 502 *"Invalid URL:"* | Keep it as a middle rung but always back it with a paid model (Haiku) as last resort |
| 9 | Assumed "no Ollama prediction line" = Ollama broken | False alarm — describe just didn't run on that event | Check which commands ran (`"command": "..."` in the log) before blaming the provider |

---

## 9. Current config reference

`.github/workflows/pr_agent.yml` env block (annotated):

```yaml
config.model: 'openrouter/z-ai/glm-5.2:free'
# heavy tier → /review. Free, 256k, multi-provider (reroutes on a 502).

config.model_weak: 'ollama_chat/gpt-oss:20b-cloud'
# light tier → /describe, /ask, /update_changelog. Offloaded to Ollama Cloud
# (independent rate limits). ollama_chat/ prefix enables Bearer auth.

OLLAMA_API_BASE: 'https://ollama.com'
OLLAMA_API_KEY: ${{ secrets.OLLAMA_API_KEY }}   # repo secret (org-unscoped = blank)

config.fallback_models: '["openrouter/free","openrouter/anthropic/claude-haiku-4.5"]'
# applies to ALL tiers. free → Stealth (often 502s); haiku → paid last resort.

config.custom_model_max_tokens: '200000'   # Haiku context window (INPUT budget)
openrouter.max_tokens: '4000'              # output cap (credit reservation): 4000 × $5/M = $0.02/call

github_action_config.auto_review: 'true'
github_action_config.auto_describe: 'true'
github_action_config.auto_improve: 'false'          # advisory; halves the OpenRouter burst
github_action_config.handle_push_trigger: 'true'
github_action_config.push_commands: '["/review"]'   # push runs = review only (describe is open/reopen-only)
```

Triggers (`on:`): `pull_request` types `[opened, reopened, ready_for_review,
synchronize]` + `issue_comment`. Remember: `pull_request` uses the PR HEAD
workflow; `issue_comment` uses main's.

---

## 10. Security note

API keys pasted into chat or commit messages are **exposed**. If a key leaks,
**rotate it immediately** at the provider (OpenRouter: settings → keys; Ollama:
https://ollama.com/settings/keys) and update the GitHub secret. We rotated the
Ollama key twice during setup after paste exposure. Treat any key in a
transcript or log as compromised — GitHub redacts secrets in **logs**, but not
in source history or chat.