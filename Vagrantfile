# -*- mode: ruby -*-
# vi: set ft=ruby :

BOX_NAME = ENV['BOX_NAME'] || "ubuntu-docker-nginx"

VAGRANTFILE_API_VERSION = "2"
Vagrant.require_version ">= 1.5.0"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
  config.vm.box = BOX_NAME
  config.vm.box = "jess/ubuntu-precise-nginx-docker"
  config.vm.box_check_update = true

  config.vm.provision :shell, :inline => "
  apt-get install jq
  rm -rf /etc/nginx
  mkdir /etc/nginx
  cp -r /nginx/* /etc/nginx/
  service nginx restart
  /script/build-images
  /script/run-apps
  "

  config.vm.provider :virtualbox do |vb|
    vb.name = "docker-presentation"
    vb.customize ["modifyvm", :id, "--cpus", 4]
    vb.customize ["modifyvm", :id, "--memory", 4096]
    vb.customize ["setextradata", :id, "VBoxInternal2/SharedFoldersEnableSymlinksCreate/v-root", "1"]
  end

  config.vm.synced_folder "./apps", "/apps"
  config.vm.synced_folder "./nginx", "/nginx"
  config.vm.synced_folder "./scripts", "/scripts"
  config.vm.network "forwarded_port", guest: 80, host: 1234, auto_correct: true
end