# Etapa 1: compilar la app Angular
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build

# Etapa 2: servir solo los archivos compilados con nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/simutalk-frontend/browser /usr/share/nginx/html
EXPOSE 80
