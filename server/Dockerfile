FROM oven/bun

WORKDIR /app

COPY package.json .
COPY bun.lockb .

RUN bun install

COPY src src
COPY tsconfig.json .

ENV NODE_ENV production

CMD ["bun", "src/app.ts"]

EXPOSE 3000