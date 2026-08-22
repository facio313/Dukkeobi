# check=skip=SecretsUsedInArgOrEnv
# PORTFOLIO_AUTH_MODE is a public branch contract, not a credential.
FROM maven:3.9.13-eclipse-temurin-8-noble AS build

WORKDIR /workspace

ARG PORTFOLIO_BRANCH
ARG PORTFOLIO_AUTH_MODE
COPY scripts/portfolio-auth-mode.sh /usr/local/bin/portfolio-auth-mode
RUN chmod 755 /usr/local/bin/portfolio-auth-mode \
    && /usr/local/bin/portfolio-auth-mode check

COPY source/Dukkeobi/pom.xml ./
COPY source/Dukkeobi/src ./src
COPY source/Dukkeobi/webapp ./webapp
RUN mvn -B -DskipTests clean package

FROM tomcat:9.0.119-jre8-temurin-jammy

ARG PORTFOLIO_BRANCH
ARG PORTFOLIO_AUTH_MODE
ENV PORTFOLIO_BRANCH=${PORTFOLIO_BRANCH} \
    PORTFOLIO_AUTH_MODE=${PORTFOLIO_AUTH_MODE}
LABEL work.bonifacio.portfolio.branch=${PORTFOLIO_BRANCH} \
      work.bonifacio.portfolio.auth-mode=${PORTFOLIO_AUTH_MODE}

RUN printf '%s\n%s\n' "$PORTFOLIO_BRANCH" "$PORTFOLIO_AUTH_MODE" \
      > /etc/portfolio-auth-build \
    && chmod 0444 /etc/portfolio-auth-build

COPY scripts/portfolio-auth-mode.sh /usr/local/bin/portfolio-auth-mode

RUN groupadd --system --gid 10001 dukkeobi \
    && useradd --system --uid 10001 --gid 10001 \
        --home-dir /usr/local/tomcat --shell /usr/sbin/nologin dukkeobi \
    && chown -R 10001:10001 \
        /usr/local/tomcat/logs \
        /usr/local/tomcat/temp \
        /usr/local/tomcat/webapps \
        /usr/local/tomcat/work \
    && chmod 755 /usr/local/bin/portfolio-auth-mode

# The WAR filename is the canonical Tomcat context: /dukkeobi.
COPY --chown=10001:10001 --from=build \
    /workspace/target/Dukkeobi-0.0.1-SNAPSHOT.war \
    /usr/local/tomcat/webapps/dukkeobi.war

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/portfolio-auth-mode", "exec", "--"]
