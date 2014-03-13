FROM stackbrew/ubuntu:12.04

# update
RUN apt-get update

# install ruby
RUN apt-get install build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion pkg-config wget -y
RUN wget http://cache.ruby-lang.org/pub/ruby/2.1/ruby-2.1.1.tar.gz
RUN tar xvf ruby-2.1.1.tar.gz
RUN cd ruby-2.1.1; ./configure; make install
RUN gem update --system

# install bundler
RUN gem install bundler

# add the source
ADD . /src

# install bundles
RUN cd /src; bundle install

WORKDIR /src

CMD ruby app.rb -o 0.0.0.0