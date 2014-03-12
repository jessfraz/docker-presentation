#!/usr/bin/env bash

if [ "$UID" -ne 0 ]; then
  echo "Please run as root"
  exit 1
fi

apt-get update

# check kernel version
uname -a

# to upgrade kernel to 3.8 if you to not have it, this requires a reboot
# apt-get -y install linux-image-generic-lts-raring linux-headers-generic-lts-raring
# reboot

# install nginx
apt-get -y install python-software-properties
add-apt-repository -y ppa:nginx/stable
apt-get -y install --force-yes nginx

# install docker
apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 36A1D7869245C8950F966E92D8576A8BA88D21E9
sh -c "echo deb http://get.docker.io/ubuntu docker main > /etc/apt/sources.list.d/docker.list"
apt-get update
apt-get -y install lxc-docker

# verify docker installed
docker --version