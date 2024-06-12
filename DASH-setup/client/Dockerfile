FROM node:16-bullseye

RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo 'deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main' | tee /etc/apt/sources.list.d/google-chrome.list
RUN apt-get update
RUN apt-get install -yq google-chrome-stable net-tools iproute2

WORKDIR /client
COPY ./data/package.json ./
RUN npm install

#RUN sed -i 's/const DEFAULT_TIMEOUT = 30000;/const DEFAULT_TIMEOUT = 100000;/g' /data/node_modules/puppeteer-core/lib/TimeoutSettings.js
#RUN sed -i 's/const DEFAULT_TIMEOUT = 30000;/const DEFAULT_TIMEOUT = 100000;/g' /data/node_modules/puppeteer/lib/TimeoutSettings.js

RUN mkdir -p /etc/my_init.d
COPY startup.sh /etc/my_init.d/startup.sh
RUN chmod +x /etc/my_init.d/startup.sh
