FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
COPY common-lib/build.gradle ./common-lib/build.gradle
COPY notification-service/build.gradle ./notification-service/build.gradle

RUN gradle dependencies --no-daemon

COPY common-lib/src ./common-lib/src
COPY notification-service/src ./notification-service/src

WORKDIR /app/notification-service

RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache curl \
    && addgroup -S app && adduser -S app -G app

USER app
WORKDIR /app

COPY --from=builder /app/notification-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 9999
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
