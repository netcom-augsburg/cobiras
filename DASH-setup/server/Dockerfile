FROM node:16-bullseye

RUN apt-get update
RUN apt-get -yq install net-tools iproute2 #ip, ifconfig
RUN apt-get -yq install ffmpeg gpac

RUN mkdir -p /etc/my_init.d
RUN mkdir -p /root/.gpac
COPY startup.sh /etc/my_init.d/startup.sh
RUN chmod +x /etc/my_init.d/startup.sh

RUN npm config set user 0
RUN npm config set unsafe-perm true
RUN npm install --global nodemon # fix sh: 1: nodemon: not found
WORKDIR /server
COPY ./data/package.json ./
RUN npm install
