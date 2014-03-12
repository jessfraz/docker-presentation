# Docker Presentation

This is a repository holding instructions on building a server like the one used in my presentaion at [BrooklynJS](http://brooklynjs.com) on March 20th, 2014.

## Setup
I have included a [Vagrantfile](https://github.com/jfrazelle/docker-presentation/blob/master/Vagrantfile) for a VirtualBox with ubuntu precise 12.04, kernel version 3.8, nginx, & docker pre-installed.

You have one of two options for setup:

- [Using the included Vagrantfile](#using-the-included-vagrantfile)
- [Roll your own](#if-you-want-to-roll-your-own)

### Using the included Vagrantfile

This is the easiest route. Just make sure you have [VirtualBox](#installing-virtualbox) and [Vagrant](#installing-vagrant) installed.

```bash
$ vagrant up
$ vagrant ssh
```

##### Installing VirtualBox

[VirtualBox](https://www.virtualbox.org/) is a general-purpose full virtualizer for x86 hardware, targeted at server, desktop and embedded use.

Installation via homebrew cask:

```bash
$ brew tap phinze/homebrew-cask
$ brew install brew-cask
$ brew cask install virtualbox
```

**If you don't use homebrew cask, you can install VirtualBox via the [VirtualBox website](https://www.virtualbox.org/wiki/Downloads).**

##### Installing Vagrant

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

##### Installing linux kernel 3.8
To quote the docker docs:

> Due to a bug in LXC, Docker works best on the 3.8 kernel. Precise comes with a 3.2 kernel, so we need to upgrade it. The kernel you’ll install when following these steps comes with AUFS built in. We also include the generic headers to enable packages that depend on them, like ZFS and the VirtualBox guest additions. If you didn’t install the headers for your “precise” kernel, then you can skip these headers for the “raring” kernel. But it is safer to include them if you’re not sure.

```bash
# install the backported kernel
sudo apt-get update
sudo apt-get install linux-image-generic-lts-raring linux-headers-generic-lts-raring

# reboot
sudo reboot
```

**This is all in [provision.sh](https://github.com/jfrazelle/docker-presentation/blob/master/provision.sh) as well**

