FROM stackbrew/ubuntu:12.04

# update
RUN apt-get update

# install node
RUN apt-get install -y --force-yes python-software-properties python g++ make
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get -y install nodejs

# install sqlite3
RUN apt-get install -y --force-yes sqlite3

# Install unzip
RUN apt-get install -y unzip

# Install curl
RUN apt-get install -y curl

WORKDIR /src

# Download Ghost v0.4.1
RUN curl -L https://ghost.org/zip/ghost-latest.zip -o /tmp/ghost.zip

# Unzip Ghost zip to /src
RUN unzip -uo /tmp/ghost.zip -d /src

# Add custom config js to /data/ghost
ADD ./config.js /src/config.js

# Install Ghost with NPM
RUN cd /src; npm install --production

RUN cd /src; npm install -g forever

EXPOSE 2368

CMD forever start --debug --verbose --minUptime 5000 --sourceDir /src --spinSleepTime 2000 -a -l /src/log index.js && tail -f /src/log