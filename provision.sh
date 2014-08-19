#!/usr/bin/env bash

function main(){
    if [ "$UID" -ne 0 ]; then
        echo "Please run as root"
        exit 1
    fi

    apt-get update
    apt-get -y upgrade

    # install nginx
    apt-get install -y --force-yes python-software-properties
    add-apt-repository -y ppa:nginx/stable
    apt-get install -y --force-yes nginx

    # install jq
    apt-get install jq

    # install docker
    curl -s https://get.docker.io/ubuntu/ | sudo sh

    # create the docker group
    groupadd docker > /dev/null
    # Add the connected user "${USER}" to the docker group.
    # Change the user name to match your preferred user.
    # You may have to logout and log back in again for
    # this to take effect.

    if id -u vagrant > /dev/null ; then
        gpasswd -a vagrant docker
    fi
    if id -u ubuntu > /dev/null ; then
        gpasswd -a ubuntu docker
    fi

    # restart docker
    service docker restart

    # verify docker installed
    docker --version

    if [[ -d /var/presentation/scripts/ ]]; then
        chmod +x /var/presentation/scripts/*
    fi
}

main