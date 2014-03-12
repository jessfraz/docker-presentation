FROM ruby/base

# add the source
ADD . /src

# install bundles
RUN cd /src; bundle install

CMD ruby /src/hello.rb