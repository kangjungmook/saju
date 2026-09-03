# Multi-stage build so Railway (or any Docker host) doesn't need a JDK or Maven installed —
# only this Dockerfile. Uses the checked-in Maven Wrapper for a reproducible build, same as
# local dev (run-local.sh/.ps1).
FROM eclipse-temurin:21-jdk AS build
WORKDIR /app
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src/ src/
RUN ./mvnw -B -q -o package -DskipTests

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
# Railway sets PORT at runtime; application.yml already reads it (server.port: ${PORT:8080}).
ENTRYPOINT ["java", "-jar", "app.jar"]
