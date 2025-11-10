FROM gradle:8.10.2-jdk17 AS builder
WORKDIR /app

COPY . .
WORKDIR /app/gateway-service

RUN gradle clean bootJar --no-daemon -x test

FROM eclipse-temurin:17-jre-alpine

RUN apk --no-cache add curl

RUN addgroup -S app && adduser -S app -G app
USER app
WORKDIR /app

COPY --from=builder /app/gateway-service/build/libs/*.jar app.jar

ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0"
EXPOSE 8989
ENTRYPOINT ["sh","-c","java $JAVA_OPTS -jar app.jar"]
