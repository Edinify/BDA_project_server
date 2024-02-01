FROM node:18-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install || npm start

COPY . .


EXPOSE 4000

CMD ["node", "server.js"]