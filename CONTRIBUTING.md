# Contributing to Techorbit

## Branch Naming

- Feature branches: `feat/<short-description>`
- Bug fix branches: `fix/<short-description>`
- Sprint branches: `sprint/<N>-<short-description>`

## Commit Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `chore:` - Maintenance
- `docs:` - Documentation
- `test:` - Tests
- `refactor:` - Refactoring
- `perf:` - Performance
- `ci:` - CI/CD

Example: `feat(identity): add 2FA setup endpoint`

## Pull Requests

1. Create a feature branch from `main`
2. Make atomic commits (one logical change per commit)
3. Run `pnpm lint && pnpm typecheck && pnpm test` before pushing
4. Open a PR with a clear description

## PR Checklist

- [ ] Tests pass
- [ ] Lint passes
- [ ] Typecheck passes
- [ ] Build succeeds
- [ ] No secrets committed
- [ ] PR description filled out