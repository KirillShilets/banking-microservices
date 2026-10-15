FROM golang:1.24.6-alpine AS builder
RUN apk add --no-cache git
RUN git clone --depth 1 --branch RELEASE.2025-08-13T08-35-41Z https://github.com/minio/mc.git /src
WORKDIR /src
RUN CGO_ENABLED=0 go build -ldflags "$(go run buildscripts/gen-ldflags.go)" -o /usr/local/bin/mc .
FROM alpine:3.22.1
RUN apk add --no-cache ca-certificates
COPY --from=builder /usr/local/bin/mc /usr/local/bin/mc
