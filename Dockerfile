# Етап збірки
FROM node:18 as build
WORKDIR /app
COPY . .
RUN npm install && npm run build

# Етап деплою
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80