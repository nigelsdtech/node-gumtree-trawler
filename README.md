# Gumtree Trawler

I got sick of searching for microwaves. The good ones disappear as soon as they're put up. the gumtree alert only sends one email a day so that wasn't much use. Hence the **gumtree trawler**. You set up a few configurations based on what you're searching for, run it on a frequent cron job, et voila!... it emails you as soon as a new one becomes available.

# Getting set up

### Install the app

Run the following:

```sh
# Clone from github
$ git clone https://github.com/nigelsdtech/node-gumtree-trawler.git
$ cd node-gumtree-trawler

# Install the node packages
$ npm install

# Create the log directory (you can specify a different one in the configs)
$ mkdir logs
```

You will also need to create a file for your Nodejs env+path under ~/bin/setup_node_env.sh. This is sourced in scripts/start.sh (which is called by npm start)

For example:

```sh
#
# For Node itself
#
for lib in "/usr/lib/node_modules"  "/usr/lib/nodejs" "/usr/share/javascript"
do
        NODE_PATH="${NODE_PATH}:$lib"
done

NODE_PATH=`echo $NODE_PATH | sed -r "s/^://"`
export NODE_PATH
```

You're ready


# Configuration


## Basic setup

There are a few configs you need to set to get up and running. The easiest thing to do is set up a file in the config directory:

```sh
$ vi config/local-production.json
```


Set the contents of the file as follows:

```json

  // Set this value to the URL of your gumtree search. Run a search in your browser, apply whatever filters you want, and copy the url in here. See the test.json config for an example.
  "gumtreeSearch": "OVERRIDE_ME",

  // The maximum number of new results you want to see
  "maxResults": 10,

  // The "reporter" module (see https://github.com/nigelsdtech/reporter) is responsible for sending out emails with the new results. It only works with gmail-operated accounts. 
  "reporter": {
    // This is the app password generated for your gmail account. See https://support.google.com/accounts/answer/185833?hl=en
    appSpecificPassword : "OVERRIDE_ME",
    // This is the "from" header in the email. For example: "My Raspberry Pi <raspberry@pi.com>"
    emailsFrom          : "OVERRIDE_ME",
    // List out the recipients of the alert separated by commas. E.g. "me@email.com, my_work@gmail.com"
    notificationTo      : "OVERRIDE_ME",
    // Your gmail login username 
    user                : "OVERRIDE_ME"
  }
```


# Running the script


```sh
$ npm start
```



# The email you will receive

It will look something like this:

```
gumtreeTrawler complete.
New results -


CURRYS ESSENTIALS C17MW14 Solo Microwave - White
13 miles | Hackney, London
https://www.gumtree.com/p/microwave-ovens/currys-essentials-c17mw14-solo-microwave-white/1286756818
£30.00


Microwave Oven
20 miles | Enfield, London
https://www.gumtree.com/p/microwave-ovens/microwave-oven/1286734757
£40.00


morphy richards microwave
12 miles | Islington, London
https://www.gumtree.com/p/microwave-ovens/morphy-richards-microwave/1286695723
£40.00

```


# Testing

There are a few basic mocha tests. They aren't exhaustive. You can find them in test/functional/tests.js . Contributions would be more than welcome. Run them as such:

```sh
you@yourmachine:~/Workspace/node-gumtree-trawler (master *% u=)$ npm test

> node-gumtree-trawl@1.0.0 test /home/you/Workspace/node-gumtree-trawler
> sh scripts/test.sh



  Finding new search results
    store file exists at startup
      ✓ records the new results
      ✓ sends a completion notice with the new results
      ✓ doesn't send an error notice
    store file doesn't exist at startup
      ✓ records the new results
      ✓ sends a completion notice with the new results
      ✓ doesn't send an error notice

  Finding no new search results
    store file exists at startup
      ✓ doesn't change the store file
      ✓ doesn't send a completion notice
      ✓ doesn't send an error notice


  9 passing (4s)

pi@lifeofpi:~/Workspace/node-gumtree-trawler
```
