FROM node:20.6-slim
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

COPY . .

RUN pnpm i
RUN pnpm build

ENV NODE_ENV=production

CMD pnpm start