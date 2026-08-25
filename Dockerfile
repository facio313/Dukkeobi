# syntax=docker/dockerfile:1
# check=skip=SecretsUsedInArgOrEnv

FROM node:24-alpine@sha256:d32cdf619f63fe0471182d08996dd516c6275bb5fd31ae06e55a570bd9e1ad43 AS build

WORKDIR /workspace/app

COPY app/package.json app/package-lock.json ./
RUN npm ci

COPY app/ ./
RUN npm test \
    && npm run typecheck \
    && npm run build


FROM nginx:alpine@sha256:db35bfc6b2951e7f8a72db5db120288c127ffaeeb4a6d4b95a26fead017d5913 AS runtime

# PORTFOLIO_AUTH_MODE is public deployment metadata, not a credential.
ARG PORTFOLIO_BRANCH
ARG PORTFOLIO_AUTH_MODE
ARG PORTFOLIO_BUILD
ENV PORTFOLIO_BRANCH=${PORTFOLIO_BRANCH} \
    PORTFOLIO_AUTH_MODE=${PORTFOLIO_AUTH_MODE} \
    PORTFOLIO_BUILD=${PORTFOLIO_BUILD}
LABEL work.bonifacio.portfolio.branch=${PORTFOLIO_BRANCH} \
      work.bonifacio.portfolio.auth-mode=${PORTFOLIO_AUTH_MODE} \
      org.opencontainers.image.revision=${PORTFOLIO_BUILD}

COPY scripts/portfolio-auth-mode.sh /usr/local/bin/portfolio-auth-mode
COPY scripts/runtime-entrypoint.sh /usr/local/bin/runtime-entrypoint
COPY ops/nginx.conf /etc/nginx/nginx.conf

RUN addgroup -S -g 10001 dukkeobi \
    && adduser -S -D -H -u 10001 -G dukkeobi -s /sbin/nologin dukkeobi \
    && chmod 0755 \
        /usr/local/bin/portfolio-auth-mode \
        /usr/local/bin/runtime-entrypoint \
    && /usr/local/bin/portfolio-auth-mode check \
    && /usr/local/bin/portfolio-auth-mode contract > /tmp/portfolio-auth-build \
    && mv /tmp/portfolio-auth-build /etc/portfolio-auth-build \
    && chmod 0444 /etc/portfolio-auth-build \
    && /usr/local/bin/portfolio-auth-mode check \
    && rm -rf /etc/nginx/conf.d /usr/share/nginx/html/*

COPY --from=build --chown=10001:10001 \
    /workspace/app/dist/ /usr/share/nginx/html/dukkeobi/

USER 10001:10001
EXPOSE 8080
STOPSIGNAL SIGQUIT

ENTRYPOINT ["/usr/local/bin/runtime-entrypoint"]
CMD ["nginx", "-g", "daemon off;"]
