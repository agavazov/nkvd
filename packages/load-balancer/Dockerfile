FROM node:18

WORKDIR /app

COPY package.json .

RUN npm install --quiet

COPY . .

RUN npm run build
