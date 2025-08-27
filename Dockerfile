FROM node:22-alpine
WORKDIR /usr/src/app
EXPOSE 25565
COPY package.json .
RUN npm install
COPY . .
CMD ["npm", "start"]
