FROM node/base

# add the source
ADD . /src

# install bundles
RUN cd /src; npm install --production

WORKDIR /src

CMD npm start