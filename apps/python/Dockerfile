FROM stackbrew/ubuntu:12.04

# update
RUN apt-get update

# install pip
RUN apt-get -y install python-pip

# add the source
ADD . /src

# install requirements
RUN cd /src; pip install -U gunicorn
RUN cd /src; pip install -r ./requirements.txt

WORKDIR /src

CMD gunicorn -b 0.0.0.0:5000 app:app