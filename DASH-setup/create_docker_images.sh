docker build -t dash-setup/netem:1.0 netem/ --network=host --no-cache &
docker build -t dash-setup/client:1.0 client/ --network=host --no-cache &
docker build -t dash-setup/server:1.0 server/ --network=host --no-cache
wait

docker image save dash-setup/client:1.0 -o client.zip
docker image save dash-setup/server:1.0 -o server.zip
docker image save dash-setup/netem:1.0 -o netem.zip

echo "DONE"

