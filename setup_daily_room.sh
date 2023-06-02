#!/bin/bash

echo "This script fetches Daily meeting tokens needed to test the various roles in this demo app."
echo

set -e

USER=$1
ROOM=$2
APIKEY=$3
SERVERROOT=$4

if [ -z "$USER" ]; then
  echo "Error: first argument must be your own Daily domain"
  exit 1
fi
if [ -z "$ROOM" ]; then
  echo "Error: second argument must be a Daily room name"
  exit 1
fi
if [ -z "$APIKEY" ]; then
  echo "Error: third argument must by your Daily API key (used to create the tokens)"
  exit 1
fi
if [ -z "$SERVERROOT" ]; then
  SERVERROOT="daily.co"
fi
echo "Using server root: $SERVERROOT"

reqdata='{"properties":{"room_name":"'$ROOM'","is_owner":true,"user_name":"host","start_audio_off":false,"start_video_off":false}}'
response=$(curl --request POST \
  --url "https://api.$SERVERROOT/v1/meeting-tokens" \
  --header "authorization: Bearer $APIKEY" \
  --header 'content-type: application/json' \
  --data "$reqdata" \
)
token=$(echo "$response" | jq -r .token)
if [ "null" = "$token" ]; then
  echo "Unable to get token, response was: $response"
  exit 2
fi
TOKEN_HOST="$token"
echo "Got host token"

reqdata='{"properties":{"room_name":"'$ROOM'","is_owner":true,"user_name":"guest","start_audio_off":false,"start_video_off":false}}'
response=$(curl --request POST \
  --url "https://api.$SERVERROOT/v1/meeting-tokens" \
  --header "authorization: Bearer $APIKEY" \
  --header 'content-type: application/json' \
  --data "$reqdata" \
)
token=$(echo "$response" | jq -r .token)
if [ "null" = "$token" ]; then
  echo "Unable to get token, response was: $response"
  exit 2
fi
TOKEN_GUEST="$token"
echo "Got guest token"

reqdata='{"properties":{"room_name":"'$ROOM'","is_owner":false,"start_audio_off":true,"start_video_off":true}}'
response=$(curl --request POST \
  --url "https://api.$SERVERROOT/v1/meeting-tokens" \
  --header "authorization: Bearer $APIKEY" \
  --header 'content-type: application/json' \
  --data "$reqdata" \
)
token=$(echo "$response" | jq -r .token)
if [ "null" = "$token" ]; then
  echo "Unable to get token, response was: $response"
  exit 2
fi
TOKEN_VIEWER="$token"
echo "Got viewer token"

echo
read -p "Write these values to .env? (Warning: Overwrites existing file!) [y/n] " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  ROOM_URL="https://$USER.$SERVERROOT/$ROOM"
  dst=".env"
  rm -f "$dst"
  echo "DAILY_ROOM_URL=$ROOM_URL" >> "$dst"
  echo "TOKEN_HOST=$TOKEN_HOST" >> "$dst"
  echo "TOKEN_GUEST=$TOKEN_GUEST" >> "$dst"
  echo "TOKEN_VIEWER=$TOKEN_VIEWER" >> "$dst"

  echo
  echo "Wrote .env file with tokens for room URL: $ROOM_URL"
  echo "You can now run the demo app (see README for more details.)"
fi
