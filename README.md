# Docker Presentation

This is a repository holding instructions on building a server like the one used in my presentaion at [BrooklynJS](http://brooklynjs.com) on March 20th, 2014.

## Table of Contents
- [Setup](#setup)
- [Build Base Images](#build-base-images)

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

A base image is what docker pulls from to start the build. You can find trusted base images in the [docker index](https://index.docker.io/). Now for this I have already created a slew of dockerfiles that we will create base images from in the [docker-base-files](https://github.com/jfrazelle/docker-presentation/blob/master/docker-base-files/) directory.

If you `ssh` into the vagrant box with the `Vagrantfile` provided, the directories are synced and these should be located at `~/docker-base-files` in your vagrant box. Included in the directory are *extremely* minimal Dockerfiles for [`node`](https://github.com/jfrazelle/docker-presentation/blob/master/docker-base-files/node/Dockerfile), [`python`](https://github.com/jfrazelle/docker-presentation/blob/master/docker-base-files/python/Dockerfile), [`ruby`](https://github.com/jfrazelle/docker-presentation/blob/master/docker-base-files/ruby/Dockerfile), and [`go`](https://github.com/jfrazelle/docker-presentation/blob/master/docker-base-files/go/Dockerfile).

### `docker build`
To build the base images, we are going to use the [`docker build`](http://docs.docker.io/en/latest/reference/commandline/cli/#build) command.

Options we are using:
- **`--rm`**: Remove intermediate containers after a successful build
- **`-t <tag-name>`**: Repository name (and optionally a tag) to be applied
         to the resulting image in case of success


```bash
$ cd ~/docker-base-files
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
