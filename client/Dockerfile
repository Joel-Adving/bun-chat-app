FROM node:lts-alpine
WORKDIR /app

COPY . .

RUN npm i
RUN npm run build

COPY . .

ENV HOST=0.0.0.0
ENV PORT=4321

ENV NODE_ENV production
CMD node ./dist/server/entry.mjs

EXPOSE 4321