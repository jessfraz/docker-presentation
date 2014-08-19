# Docker Presentation

This is a repository holding instructions on building a server like the one used in my presentation at [BrooklynJS](http://brooklynjs.com) on March 20th, 2014. You can find my slides here: [http://decks.jessfraz.com/brooklyn-js/docker/](http://decks.jessfraz.com/brooklyn-js/docker/).

When you are all finished reading this and understand the `build` and `run`docker commands, checkout the [scripts](scripts) directory. I sealed all this up in a bow for you.

- [`setup-nginx`](scripts/setup-nginx): sets up the main nginx config with the apps-enabled directory
- [`build-images`](scripts/build-images): builds the base images
- [`run-apps`](scripts/run-apps): spins up all the containers for the apps and routes them accordingly with [`publish`](scripts/publish)

But, I would highly suggest looking these over and seeing how they work, there's some fun things with `grep` and `awk`.

## Setup
I have included a [Vagrantfile](https://github.com/jfrazelle/docker-presentation/blob/master/Vagrantfile) for a VirtualBox with ubuntu trusty 14.04. It will also provision nginx, & docker for you on the first `vagrant up`.

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

I have included [provision.sh](https://github.com/jfrazelle/docker-presentation/blob/master/provision.sh), which will install nginx and docker.

```bash
$ sudo ./provision.sh
```

#### Installing linux kernel 3.8

If using ubuntu 12.04 (precise) you will need to upgrade the kernel.

**Don't know your kernel version?** Just type `uname -a` in the command line and it will return it for you.

To quote the docker docs:

> Due to a bug in LXC, Docker works best on the 3.8 kernel. Precise comes with a 3.2 kernel, so we need to upgrade it. The kernel you’ll install when following these steps comes with AUFS built in. We also include the generic headers to enable packages that depend on them, like ZFS and the VirtualBox guest additions. If you didn’t install the headers for your “precise” kernel, then you can skip these headers for the “raring” kernel. But it is safer to include them if you’re not sure.

```bash
# install the backported kernel
$ sudo apt-get update
$ sudo apt-get install linux-image-generic-lts-raring linux-headers-generic-lts-raring

# reboot
$ sudo reboot
```

## Build Base Images

A base image is what docker pulls from to start the build. You can find trusted base images in the [docker index](https://index.docker.io/). Now for this I have already created a slew of dockerfiles that we will create base images from in the [apps](https://github.com/jfrazelle/docker-presentation/blob/master/apps/) directory.

If you `ssh` into the vagrant box with the `Vagrantfile` provided, the directories are synced and these should be located at `/var/presentation/apps` in your vagrant box. Included in the directory are *extremely* minimal Dockerfiles for [`node`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/node/Dockerfile), [`python`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/python/Dockerfile), [`ruby`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/ruby/Dockerfile), and [`go`](https://github.com/jfrazelle/docker-presentation/blob/master/apps/go/Dockerfile).

This is a great reference on caching and best parctices: [Docker Best Practices](http://crosbymichael.com/dockerfile-best-practices.html).

**NOTE**: For the purposes of this I have seperate dockerfiles, but in a perfect world you would have images based off languages. Then in other dockerfiles that use that language you can import `FROM lang/base`. Like the example in my [slides](http://decks.jessfraz.com/brooklyn-js/docker/#6). Since the cache works from the top to the bottom you want all the similar things that most dockerfiles have at the top and then the volatile changes at the bottom.

### `docker build`
To build the base images, we are going to use the [`docker build`](http://docs.docker.io/en/latest/reference/commandline/cli/#build) command. [More info](http://docs.docker.io/en/latest/reference/commandline/cli/#build)

Options we are using:

- **`--rm`**: Remove intermediate containers after a successful build
- **`-t <tag-name>`**: Repository name (and optionally a tag) to be applied
         to the resulting image in case of success


```bash
$ cd /var/presentation/apps
```

**node**

```bash
$ sudo docker build --rm -t node/base node/
```

*with sqlite3*

```bash
$ sudo docker build --rm -t ghost/base blog/
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
$ sudo docker build --rm -t golang/base go/
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
$ sudo cp -r /var/presentation/nginx/* /etc/nginx/

# restart nginx
$ sudo service nginx restart
```

## Run Apps

### `docker run`
The docker run command first creates a writeable container layer over the specified image, and then starts it using the specified command. [More info](http://docs.docker.io/en/latest/reference/commandline/cli/#run)

Options we are using:

- **`-d`**: Detached mode: Run container in the background, print new container id
- **`--name <name>`**: Assign the specified name to the container. If no name is specific docker will generate a random name
- **`-p <port>`**: Map a network port to the container

**node**

hello world example

```bash
$ sudo docker run --name node_hello_world -p 3000 -d node/base
$ sudo /var/presentation/scripts/publish node 0.0.0.0:<port>
```

ghost blog example

```bash
$ sudo docker run --name node_ghost -p 3000 -d ghost/base
$ sudo /var/presentation/scripts/publish blog 0.0.0.0:<port>
```

**python**

```bash
$ sudo docker run --name python_hello_world -p 5000 -d python/base
$ sudo /var/presentation/scripts/publish python 0.0.0.0:<port>
```

**ruby**

```bash
$ sudo docker run --name ruby_hello_world -p 4567 -d ruby/base
$ sudo /var/presentation/scripts/publish ruby 0.0.0.0:<port>
```

**go**

```bash
$ sudo docker run --name go_hello_world -p 8080 -d golang/base
$ sudo /var/presentation/scripts/publish go 0.0.0.0:<port>
```


[![Analytics](https://ga-beacon.appspot.com/UA-29404280-16/docker-presentation/README.md)](https://github.com/jfrazelle/docker-presentation)
