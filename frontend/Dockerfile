FROM nginx:alpine

ARG API_URL=http://localhost:3000

COPY index.html /tmp/index.html

# Substituir API_URL no index.html
RUN sed "s|http://localhost:3000|${API_URL}|g" /tmp/index.html > /usr/share/nginx/html/index.html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]