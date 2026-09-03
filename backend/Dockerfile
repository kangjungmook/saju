# Multi-stage build so Railway (or any Docker host) doesn't need a JDK or Maven installed —
# only this Dockerfile. Uses the checked-in Maven Wrapper for a reproducible build, same as
# local dev (run-local.sh/.ps1).
#
# Builds online (no -o): `dependency:go-offline` + an offline package step was tried first
# for Docker layer caching, but go-offline doesn't reliably pull every transitive dependency
# the actual package lifecycle needs (some plugin-scoped ones especially) — it failed a real
# Railway build with "Cannot access central ... in offline mode" for deps it never fetched.
# Simpler and correct beats the caching optimization here.
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
COPY src/ src/
RUN ./mvnw -B -q package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Railway sets PORT at runtime; application.yml already reads it (server.port: ${PORT:8080}).
ENTRYPOINT ["java", "-jar", "app.jar"]
