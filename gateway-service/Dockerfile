FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY settings.gradle build.gradle ./
COPY gradle ./gradle
COPY gateway-service/build.gradle ./gateway-service/

RUN gradle dependencies --no-daemon

COPY gateway-service/src ./gateway-service/src

WORKDIR /app/gateway-service
RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache curl \
    && addgroup -S app && adduser -S app -G app

USER app
WORKDIR /app

COPY --from=builder /app/gateway-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8989
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]