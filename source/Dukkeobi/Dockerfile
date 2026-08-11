FROM maven:3.9.13-eclipse-temurin-8-noble AS build

WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
COPY webapp ./webapp
RUN mvn -B -DskipTests clean package

FROM tomcat:9.0.119-jre8-temurin-jammy

RUN groupadd --system --gid 10001 dukkeobi \
    && useradd --system --uid 10001 --gid 10001 \
        --home-dir /usr/local/tomcat --shell /usr/sbin/nologin dukkeobi \
    && chown -R 10001:10001 \
        /usr/local/tomcat/logs \
        /usr/local/tomcat/temp \
        /usr/local/tomcat/webapps \
        /usr/local/tomcat/work

# The WAR filename is the canonical Tomcat context: /dukkeobi.
COPY --chown=10001:10001 --from=build \
    /workspace/target/Dukkeobi-0.0.1-SNAPSHOT.war \
    /usr/local/tomcat/webapps/dukkeobi.war

USER 10001:10001
EXPOSE 8080
