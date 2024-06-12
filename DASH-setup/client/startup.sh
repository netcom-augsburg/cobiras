#!/usr/bin/env bash
# shellcheck disable=SC1068
trap 'echo "# $BASH_COMMAND"' DEBUG

source /.env
echo "$CLIENT_IP"

# Put here the IP of the interface connected to the shaping/netem host.
ip route add "${NETWORK_SERVER}" via "${NETEM_CLIENT_IP}" dev eth0

# dont let the docker container exit
while :; do :; done & kill -STOP $! && wait $!
