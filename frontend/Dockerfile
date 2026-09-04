FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
ARG VITE_KEYCLOAK_URL=http://keycloak.localhost:8080
ARG VITE_KEYCLOAK_REALM=bank-realm
ARG VITE_KEYCLOAK_CLIENT_ID=banking-frontend
ARG VITE_GATEWAY_URL=http://localhost:8989
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
ENV VITE_GATEWAY_URL=$VITE_GATEWAY_URL
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]