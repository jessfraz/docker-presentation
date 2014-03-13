FROM stackbrew/ubuntu:12.04

# update
RUN apt-get update

# install node
RUN apt-get install -y --force-yes python-software-properties python g++ make
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update
RUN apt-get -y install nodejs

# add the source
ADD . /src

# install modules
RUN cd /src; npm install --production

WORKDIR /src

CMD npm start