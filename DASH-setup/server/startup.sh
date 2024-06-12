#!/usr/bin/env bash
trap 'echo "# $BASH_COMMAND"' DEBUG

source /.env
echo "$SERVER_IP"

# Put here the IP of the interfaces connected to the server and client
ip route add "${NETWORK_CLIENT}" via "${NETEM_SERVER_IP}" dev eth0

cd /server/
npm start
#DEBUG = express:* node app.js
