FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
COPY common-lib/build.gradle ./common-lib/build.gradle
COPY security-lib/build.gradle ./security-lib/build.gradle
COPY account-service/build.gradle ./account-service/build.gradle

RUN gradle dependencies --no-daemon

COPY common-lib/src ./common-lib/src
COPY security-lib/src ./security-lib/src
COPY account-service/src ./account-service/src

WORKDIR /app/account-service

RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine@sha256:3c472129dc75a8d1d7a3f2df5b2093a8077e4493deff046754d4764d0371de63
RUN addgroup -S app -g 10001 && adduser -S app -u 10001 -G app

USER 10001
WORKDIR /app

COPY --from=builder /app/account-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8081
ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar app.jar"]