FROM elixir:1.14-alpine
RUN apk add --no-cache build-base inotify-tools postgresql-client git

WORKDIR /app

RUN mix local.hex --force && \
    mix local.rebar --force

EXPOSE 4000

