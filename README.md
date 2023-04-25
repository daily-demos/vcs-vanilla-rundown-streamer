# VCS Vanilla Rundown Streamer

*WIP*

This app demonstrates hybrid Interactive Live Streaming (ILS) on Daily.co.

It uses the Video Component System (VCS) to provide matching rendering on both client and server from a unified code base.

_What's hybrid ILS?_

- ILS means video streaming that's very low latency (a fraction of a second). This allows viewers to interact directly with the stream host.
  - Read more: [link to daily blog]

- Hybrid means [...]

_What's VCS and why is it interesting?_

- [...]

_What's a rundown?_

- [...]

_What makes this vanilla?_

- [...]

## Initial setup

You must configure a .env file with tokens for your room and domain.

There's a helper script that will do it for you:

```
./setup_daily_room.sh [your daily domain] [your room name] [your daily api key]
```

## Usage

`yarn start`

In browser, open the host view:

`http://localhost:1234/?role=host`

Join as a guest:

`http://localhost:1234/?role=guest`

Join as a viewer without the role param:

`http://localhost:1234`


## Things to try



## Demo limitations


## Supporting large audiences


## Changing the composition

