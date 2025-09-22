## Git Feature Workflow (Initial → Approved → Main)

This guide defines the end-to-end workflow for delivering new features from ideation to merge into `main`. It complements `docs/GUIDELINES/CONTRIBUTING.md`.

### Goals
- Predictable branch naming and PR lifecycle
- High-quality changes with clear ownership and traceability
- Small, reviewable PRs that keep `main` stable

### Prerequisites
- You have a tracked issue for the feature (Epic/Story/Bug) with clear acceptance criteria
- You are on an up-to-date `main`

### Branch Naming
- Feature: `feature/<scope>/<short-desc>` (e.g., `feature/heatmap/weekly-thresholds`)
- Fix: `fix/<short-desc>` (e.g., `fix/capacity-overflow-check`)
- Chore/Refactor: `chore/<short-desc>` or `refactor/<short-desc>`

Keep names lowercase, hyphen-separated; keep them short and specific.

### Commit Style (Conventional Commits)
- `feat(scope): summary`
- `fix(scope): summary`
- `chore(scope): summary`
- `refactor(scope): summary`
- `test(scope): summary`

Scope examples: `api`, `db`, `frontend`, `capacity`, `heatmap`, `auth`.

### Lifecycle

1) Initialize branch (Initial)
```
git checkout main
git pull --rebase
git checkout -b feature/<scope>/<short-desc>
```

2) Create Draft PR early (WIP)
- Push your branch and open a Draft PR
- Link the tracking issue ("Closes #123")
- Title using Conventional Commit style, e.g., `feat(heatmap): weekly thresholds`
- Fill the PR checklist from `docs/GUIDELINES/CONTRIBUTING.md`
- Add labels: `feature`, `WIP` (or equivalent in repo)

3) Develop in small, reviewable commits
- Keep PRs focused (< ~300 LOC net where practical)
- Add/modify tests together with code
- Update docs and ADRs when conventions/interfaces change
- Feature flag as appropriate per `docs/GUIDELINES/FEATURE_FLAGS.md`

4) Stay up to date with main
Prefer rebase to keep history linear; if prohibited by policy, use merge.
```
git fetch origin
git rebase origin/main
# resolve conflicts
git rebase --continue
git push --force-with-lease
```

5) Ready for review (Approved)
- Convert PR from Draft to Open
- Ensure CI green (lint, typecheck, unit/integration/E2E where applicable)
- Request reviewers; risky areas (migrations, capacity logic) need 2 approvals
- Provide screenshots or clips for UI changes
- Note any migration/operational considerations in PR description

6) Address review feedback
- Keep changes scoped; if scope grows, split into follow-up PRs
- Avoid large force-pushes after reviews; use `--force-with-lease` only when rebasing

7) Merge (to Main)
- Use Squash & Merge
- PR title becomes the squashed commit message (Conventional Commit)
- Ensure the PR description contains `Closes #<issue>` so the issue auto-closes
- Delete the remote branch after merge

8) Post-merge
- Verify the change in the target environment (staging/prod per checklist)
- If a follow-up task is needed (e.g., backfill, cleanup), create and link the issue

### Testing Expectations
- Unit tests for services/utils; component tests for UI
- Integration tests for API+DB flows touching this feature
- E2E for critical user journeys (see `docs/GUIDELINES/TESTING_GUIDELINES.md`)
- Performance checks for heatmap/WS where specified

### Database & Migrations
- Follow `docs/GUIDELINES/MIGRATIONS_GUIDE.md` and `docs/GUIDELINES/DATABASE_CONVENTIONS.md`
- Provide down scripts where feasible; call out risky operations in PR

### API & Contracts
- Follow `docs/GUIDELINES/API_CONVENTIONS.md`
- Maintain stable response shapes; version or feature-flag when breaking

### Security
- Input validation at edges (Zod)
- RBAC checks in controllers for protected routes
- No secrets/PII in logs; sanitize error messages

### Observability
- Structured logs with request IDs
- Add metrics or traces if the feature introduces new critical paths

### Example Command Reference
```
# 1) Create branch
git checkout main && git pull --rebase
git checkout -b feature/heatmap/weekly-thresholds

# 2) First push + open Draft PR
git push -u origin feature/heatmap/weekly-thresholds

# 3) Keep branch updated
git fetch origin && git rebase origin/main
git push --force-with-lease

# 4) Squash merge from GitHub UI when approved
# (PR title: feat(heatmap): weekly thresholds)

# 5) Cleanup
git checkout main && git pull --rebase
git branch -d feature/heatmap/weekly-thresholds
```

### FAQ
- Q: Merge or rebase? A: Prefer rebase to keep history linear; if policy requires, use merge.
- Q: When to split a PR? A: If it mixes unrelated concerns or grows beyond a comfortable review size.
- Q: Can I stack PRs? A: Yes; clearly indicate base branches and keep each PR independently reviewable.

### References
- `docs/GUIDELINES/CONTRIBUTING.md`
- `docs/GUIDELINES/CODING_CONVENTIONS.md`
- `docs/GUIDELINES/FEATURE_FLAGS.md`
- `docs/GUIDELINES/TESTING_GUIDELINES.md`
- `docs/GUIDELINES/MIGRATIONS_GUIDE.md`


