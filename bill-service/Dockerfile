FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
COPY common-lib/build.gradle ./common-lib/build.gradle
COPY security-lib/build.gradle ./security-lib/build.gradle
COPY bill-service/build.gradle ./bill-service/build.gradle

RUN gradle dependencies --no-daemon

COPY common-lib/src ./common-lib/src
COPY security-lib/src ./security-lib/src
COPY bill-service/src ./bill-service/src

WORKDIR /app/bill-service

RUN gradle clean bootJar --no-daemon -x test

# Runtime base pinned to a digest: mutable tags are not reproducible for a banking runtime.
FROM eclipse-temurin:17-jre-alpine@sha256:3c472129dc75a8d1d7a3f2df5b2093a8077e4493deff046754d4764d0371de63

# Non-root runtime user with a fixed UID (matches the Helm runAsUser/fsGroup 10001).
# curl is intentionally omitted: liveness/readiness probes are kubelet httpGet,
# not shell exec, so no shell tooling is needed in the runtime image.
RUN addgroup -S app -g 10001 && adduser -S app -u 10001 -G app

USER 10001
WORKDIR /app

COPY --from=builder /app/bill-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8082
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar app.jar"]
