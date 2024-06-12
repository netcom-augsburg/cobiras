#!/usr/bin/env bash
trap 'echo "# $BASH_COMMAND"' DEBUG

source /.env
echo "$NETEM_SERVER_IP"
echo "$NETEM_CLIENT_IP"

sysctl net.ipv4.ip_forward=1

# Disable all offloading features
for eth in eth0 eth1
do
  for feature in "gso" "gro" "tso"
  do
    ethtool -K $eth $feature off
  done
done

# dont let the docker container exit
while :; do :; done & kill -STOP $! && wait $!
