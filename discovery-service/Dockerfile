FROM gradle:8.10.2-jdk17-alpine AS builder
WORKDIR /app

COPY build.gradle ./
RUN gradle dependencies --no-daemon

COPY src src

RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine

RUN apk add --no-cache curl \
    && addgroup -S app && adduser -S app -G app

USER app
WORKDIR /app

COPY --from=builder /app/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8761
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
