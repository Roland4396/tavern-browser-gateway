FROM nginx:1.29-alpine

COPY gateway.conf /etc/nginx/conf.d/default.conf
COPY intercept.js /usr/share/nginx/html/shell/intercept.js
