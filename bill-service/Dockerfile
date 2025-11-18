FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
COPY common-lib ./common-lib
COPY bill-service ./bill-service

WORKDIR /app/bill-service

RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache curl \
    && addgroup -S app && adduser -S app -G app

USER app
WORKDIR /app

COPY --from=builder /app/bill-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8082
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
