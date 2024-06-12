#!/usr/bin/env bash
# trap 'echo "# $BASH_COMMAND"' DEBUG

bandwidth_trace=$1
echo $bandwidth_trace

readarray -t bw_vals <$bandwidth_trace

sleep 1

tc qdisc del dev eth0 root
tc qdisc add dev eth0 root handle 1: htb default 1
tc class add dev eth0 parent 1: classid 1:1 htb rate 125000bps

for line in "${bw_vals[@]}"; do
  tc class change dev eth0 parent 1: classid 1:1 htb rate "$line"bps
  sleep 1
done
