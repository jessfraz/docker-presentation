# Docker Presentation

This is a repository holding instructions on building a server like the one used in my presentaion at [BrooklynJS](http://brooklynjs.com) on March 20th, 2014.

## Table of Contents
- [Setup](#setup)
- [Build Base Images](#build-base-images)
- [Setup `nginx`](#setup-nginx)
- [Run Apps](#run-apps)

## Setup
I have included a [Vagrantfile](https://github.com/jfrazelle/docker-presentation/blob/master/Vagrantfile) for a VirtualBox with ubuntu precise 12.04, kernel version 3.8, nginx, & docker pre-installed.

You have one of two options for setup:

- [Use the included Vagrantfile](#using-the-included-vagrantfile)
- [Roll your own](#if-you-want-to-roll-your-own)

### Using the included Vagrantfile

This is the easiest route. Just make sure you have [VirtualBox](#installing-virtualbox) and [Vagrant](#installing-vagrant) installed.

```bash
# install the box, it's a rather large box with everything pre-installed
# it could take about ten min
$ vagrant box add jess/ubuntu-precise-nginx-docker

# bring the server up, ssh in
$ vagrant up
$ vagrant ssh
```

#### Installing VirtualBox

[VirtualBox](https://www.virtualbox.org/) is a general-purpose full virtualizer for x86 hardware, targeted at server, desktop and embedded use.

Installation via homebrew cask:

```bash
$ brew tap phinze/homebrew-cask
$ brew install brew-cask
$ brew cask install virtualbox
```

**If you don't use homebrew cask, you can install VirtualBox via the [VirtualBox website](https://www.virtualbox.org/wiki/Downloads).**

#### Installing Vagrant

[Vagrant](http://www.vagrantup.com/) is a tool for building complete development environments. With an easy-to-use workflow and focus on automation, Vagrant lowers development environment setup time, increases development/production parity, and makes the "works on my machine" excuse a relic of the past.

Installation via homebrew cask:

```bash
$ brew cask install vagrant
```

**If you don't use homebrew cask, you can install Vagrant via the [Vagrant website](http://www.vagrantup.com/downloads.html).**

**Vagrant Completions (optional, but helpful nonetheless):** Add autocomplete for Vagrant to bash completion.

```bash
$ brew tap homebrew/completions
$ brew install vagrant-completion
```

Then just add the following to your `.bash_profile` to source the completions:

```bash
[ -f `brew --prefix`/etc/bash_completion.d/vagrant ]; source `brew --prefix`/etc/bash_completion.d/vagrant
```

### If you want to roll your own

I have included [provision.sh](https://github.com/jfrazelle/docker-presentation/blob/master/provision.sh), which will install nginx and docker. You can also uncomment [lines 14-15](https://github.com/jfrazelle/docker-presentation/blob/master/provision.sh#L14-15) and upgrade your kernel to 3.8, but note **this requires a `reboot` following install of the new kernel**.

**Don't know your kernel version?** Just type `uname -a` in the command line and it will return it for you.

```bash
$ sudo ./provision.sh
```

#### Installing linux kernel 3.8
To quote the docker docs:

> Due to a bug in LXC, Docker works best on the 3.8 kernel. Precise comes with a 3.2 kernel, so we need to upgrade it. The kernel you’ll install when following these steps comes with AUFS built in. We also include the generic headers to enable packages that depend on them, like ZFS and the VirtualBox guest additions. If you didn’t install the headers for your “precise” kernel, then you can skip these headers for the “raring” kernel. But it is safer to include them if you’re not sure.

```bash
# install the backported kernel
$ sudo apt-get update
$ sudo apt-get install linux-image-generic-lts-raring linux-headers-generic-lts-raring

# reboot
$ sudo reboot
```

**This is all in [provision.sh](https://github.com/jfrazelle/docker-presentation/blob/master/provision.sh) as well**

## Build Base Images

A base image is what docker pulls from to start the build. You can find trusted base images in the [docker index](https://index.docker.io/). Now for this I have already created a slew of dockerfiles that we will create base images from in the [apps](https://github.com/jfrazelle/docker-presentation/blob/master/apps/) directory.

If you `ssh` into the vagrant box with the `Vagrantfile` provided, the directories are synced and these should be located at `/docker-base-files` in your vagrant box. Included in the directory are *extremely* minimal Dockerfiles for [`node`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/node/Dockerfile), [`python`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/python/Dockerfile), [`ruby`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/ruby/Dockerfile), and [`go`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/go/Dockerfile).

**`TODO`**: talk about caching and how its awesome

### `docker build`
To build the base images, we are going to use the [`docker build`](http://docs.docker.io/en/latest/reference/commandline/cli/#build) command.

Options we are using:
- **`--rm`**: Remove intermediate containers after a successful build
- **`-t <tag-name>`**: Repository name (and optionally a tag) to be applied
         to the resulting image in case of success


```bash
$ cd /apps
```

**node**

```bash
$ sudo docker build --rm -t node/base node/
```

**python**

```bash
$ sudo docker build --rm -t python/base python/
```

**ruby**

```bash
$ sudo docker build --rm -t ruby/base ruby/
```

**go**

```bash
$ sudo docker build --rm -t go/base go/
```

#### View your images

```bash
$ sudo docker images
```

If you see any images named `<none>`, run `sudo docker rmi $(sudo docker images | grep "^<none>" | awk "{print $3}")` to remove untagged images.

**Other Helpful commands:** To stop all docker containers run `sudo docker stop $(sudo docker ps -a -q)`, and to remove all docker containers run `sudo docker rm $(sudo docker ps -a -q)`.

## Setup `nginx`

We are going to want to create proxy redirects on the fly so we are going to replace the default nginx config files with our own.

```bash
$ sudo rm -rf /etc/nginx
$ sudo mkdir /etc/nginx
$ sudo cp -r /nginx/* /etc/nginx/

# restart nginx
$ sudo service nginx restart
```

## Run Apps

**`TODO`**: run apps instructions, talk about caching awesomeness, nginx proxys, publish script

### `docker run`

**node**

```bash
$ cd /apps/node
$ sudo docker run --name node_hello_world -p 3000 -d node/base
$ sudo /scripts/publish node 0.0.0.0:<port>
```

**python**

```bash
$ cd /apps/python
$ sudo docker run --name python_hello_world -p 5000 -d python/base python /src/app.py
$ sudo /scripts/publish python 0.0.0.0:<port>
```

**ruby**

```bash
$ cd /apps/ruby
$ sudo docker run --name ruby_hello_world -p 4567 -d ruby/base ruby /src/app.rb
$ sudo /scripts/publish ruby 0.0.0.0:<port>
```

**go**

```bash
$ cd /apps/go
$ sudo docker build --rm -t go/base
$ sudo /scripts/publish go 0.0.0.0:<port>
```

```bash
if docker images | awk '{ print $1 }' | grep "^${IMAGE_NAME}$" > /dev/null; then
  info "${IMAGE_NAME} was already built"
else
    # run the build
fi
```

**`TODO`**: pull some apps from git in dockerfile

**`TODO`**: add some notes about how to attach logs, shit this is getting long

**`TODO`**: talk about how easily this could be automated