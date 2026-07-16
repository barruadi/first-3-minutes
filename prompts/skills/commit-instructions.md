# Commit Guidelines

Adapted for this project (Expo React Native + FastAPI backend, TypeScript/Python monorepo).

---

## Naming Convention

Format: `[<type>] <short description>`

- Lowercase type, wrapped in brackets, space separator, lowercase description
- No period at the end
- Description is imperative or noun-phrase (not past tense)

### Types in use

| Type       | Meaning                                          | Example |
|------------|--------------------------------------------------|---------|
| `feat`     | New feature or module                            | `[feat] drill state machine with reducer and types` |
| `add`      | Adding a file, library, or dependency (not code) | `[add] expo-av and expo-speech to resident-mobile` |
| `fix`      | Bug fix                                          | `[fix] completed phase never transitions to submitting` |
| `hotfix`   | Urgent fix on a deployed/merged state            | `[hotfix] posture hook creates duplicate accelerometer subscription` |
| `refactor` | Code restructure without behavior change         | `[refactor] extract gyro variance into standalone module` |
| `chore`    | Build, tooling, CI, scripts                      | `[chore] configure jest-expo preset and transform ignore` |
| `cleanup`  | Removing dead code, formatting, indentation      | `[cleanup] remove scaffold placeholder screens` |
| `docs`     | Documentation only                               | `[docs] architecture coordinate convention` |

> **Avoid** `change:` — use `[refactor]` or `[feat]` depending on whether behavior changed. Use the bracket style, never the `feat:` colon style.

---

## Atomicity

Each commit should cover **one logical unit of work**. The test: if you had to revert or cherry-pick it, would the codebase still compile and make sense?

**Good atoms (for this repo):**
- Adding a package in one commit (`[add] expo-sensors and expo-camera to resident-mobile`)
- Implementing one hook or module (`[feat] useShelterValidator with gyro rolling variance`)
- Fixing one specific bug (`[fix] SUBMIT_START action missing from drill reducer`)
- A single backend endpoint (`[feat] POST /api/drills/:id/complete with rating formula`)
- Wiring two domains together (`[feat] spatial map store handoff from ScanScreen to DrillScreen`)

**Too coarse — split these:**
- Domain 1 scan pipeline + Domain 2 sensor hooks in one commit
- FastAPI endpoint + frontend adapter + UI in one commit
- New feature and its bug fix in one commit

**Too fine — combine these:**
- Several one-liner fixes to the same hook in the same session
- Type definition + constant that only serve the same feature

---

## Scope prefixes (optional, for monorepo clarity)

When a commit touches only one workspace, prefix the description:

```
[feat] mobile: drill audio manager with earthquake and fire alarm
[feat] api: spatial scan endpoint with gemini orchestration
[feat] admin: analytics dashboard with participation rate chart
[fix] contracts: confidence field made optional on SpatialObject
```

Omit the prefix when the change spans multiple workspaces (e.g. updating a shared contract and both consumers).

---

## When to Commit

Commit when the change is **complete and coherent** by itself:

1. **After adding a dependency** — `package.json` updated, lockfile in, it builds.
2. **After implementing a self-contained module** — e.g. a hook, reducer, or FastAPI router compiles; existing interfaces unchanged.
3. **After fixing a bug** — the bug is gone, no unrelated changes included.
4. **After a refactor** — behavior identical before/after, tests still pass.
5. **After wiring two systems together** — integration commit (e.g. domain handoff, API adapter).
6. **Before switching context** — don't let unrelated in-progress work mix.

Do **not** commit:
- WIP / half-broken state (stash instead)
- Mixed concerns (new feature + unrelated cleanup)
- Generated artifacts (`dist/`, `node_modules/`, `__pycache__/` — gitignored)

---

## Branch Naming (for reference)

Branches follow `<type>/<short-slug>`:

```
feat/drill-state-machine
feat/spatial-scan-upload
fix/shelter-validator-race
chore/jest-expo-config
domain-2/ar-sensor-gameplay
domain-3/backend-ai-pipeline
```
