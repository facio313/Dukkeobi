# Dukkeobi portfolio app

## Authentication environments

The repository follows the shared portfolio branch contract:

- `main` and `dev` resolve to `PORTFOLIO_AUTH_MODE=sso`; the running app is
  accessible through the Bonifacio SSO edge.
- Every other branch resolves to `PORTFOLIO_AUTH_MODE=local`; the app's
  loopback-bound port may be opened directly for development.

The deployed app has no login/account mapper or application-owned identity
store. Its PostgreSQL access is limited to the archived map-domain data; SSO
authorization remains at the Bonifacio edge.

`PORTFOLIO_AUTH_MODE` is derived from `PORTFOLIO_BRANCH`. A supplied mismatch,
or a detached build without an explicit branch, fails closed.

Build a local branch image from the repository root:

```bash
export PORTFOLIO_BRANCH="$(git branch --show-current)"
export PORTFOLIO_AUTH_MODE="$(scripts/portfolio-auth-mode.sh print)"
docker build \
  --build-arg PORTFOLIO_BRANCH \
  --build-arg PORTFOLIO_AUTH_MODE \
  -f source/Dukkeobi/Dockerfile \
  -t ghcr.io/facio313/dukkeobi:local .
```

The deployment workflow builds `main` and `dev` with SSO metadata and immutable
SHA tags. Only `main` updates `latest` and requests the production deployment.
