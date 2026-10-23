FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime base pinned to a digest: mutable tags are not reproducible for a banking runtime.
FROM nginxinc/nginx-unprivileged:1.27-alpine@sha256:65e3e85dbaed8ba248841d9d58a899b6197106c23cb0ff1a132b7bfe0547e4c0
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
USER 101
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
