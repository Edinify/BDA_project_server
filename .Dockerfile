FROM node

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

EXPOSE 4000

ENV MONGODB_USERNAME=bda
ENV MONGODB_PASSWORD=bdarehman

CMD ["npm", "start"]


