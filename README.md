Making StackMob cross domain calls with postMessage, not CORS
========

## Overview

StackMob's JavaScript SDK uses AJAX to communicate with StackMob's API server: `https://api.stackmob.com`.  Normally cross domain AJAX calls are blocked by browsers' same-domain origin policies, blocking calls to `api.stackmob.com` from `mysite.com`.

StackMob supports CORS, but not all browsers do.  This is a workaround using HTML5's `postMessage`.

## How it works

An HTML5 feature called `postMessage` lets two windows/frames within your browser to talk to each other.  We'll load an iframe on your HTML page, and that iframe will contain a page on StackMob's hosted server.  That iframe page is now technically on the same domain and can make same-domain AJAX calls with no special CORS settings.  It's just a regular AJAX call, thereby offering you the widest browser support.  That iframe page will host a StackMob JS SDK instance that will run your calls for you.

Your page will use a modified version of the StackMob JS SDK that uses `postMessage` to communicate with the iframe's StackMob JS SDK to make AJAX calls on your behalf.  With `postMessage`, the two windows will communicate with each other, passing request and response information between them, and your StackMob JS SDK will effectively have the same behavior.  But don't worry, all the heavy lifting is done for you already in `stackmob-proxy.js` and its counterpart `proxy.html`.

## What's needed

The approach involves three files:

1. `proxy.html` - a static file on StackMob's HTML hosting service that is provided here
2. `client.html` - any of your HTML pages, represented by `client.html` in this example
3. `stackmob-proxy.js` - a static StackMob JavaScript file - included in your HTML file

<b>You also need to use <a href="https://marketplace.stackmob.com/module/html5" target="_blank">StackMob's Hosting service</a></b> because it can support the AJAX calls properly (special logic on StackMob web servers).  Only `proxy.html` needs to be on the hosting service.  All your other HTML files can live on your servers.

You will also need a <a href="http://www.github.com" target="_blank">GitHub</a> account for use with the Hosting service.


## Installation Instructions

1.  Install the <a href="https://marketplace.stackmob.com/module/html5" target="_blank">StackMob's Hosting service</a> (only used for `proxy.html`, not your web files)
2.  Initialize the StackMob JS SDK in `proxy.html`

        StackMob.init({
          publicKey : [your public key],
          useRelativePathForAjax : true, //note this line!
          apiVersion : 0
        });

3.  Modify the `whiteListedDomain` in `proxy.html`.  If your domain is `http://www.mysite.com` then:

        var whiteListedDomain = 'http://www.mysite.com';

4.  Deploy `proxy.html` to <a href="https://marketplace.stackmob.com/module/html5" target="_blank">StackMob's Hosting service</a> (<a href="https://developer.stackmob.com/module/html5" target="_blank">how-to here</a>)
5.  Include `stackmob-proxy.js` in **your** HTML pages (e.g `client.html` in this case) immediately after the included StackMob JS SDK.  It's an extension.

        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
        <script type="text/javascript" src="http://static.stackmob.com/js/stackmob-js-0.9.1-bundled-min.js"></script>
        <script type="text/javascript" src="stackmob-proxy.js"></script>

6.  Initialize your pages' StackMob JS SDK (`client.html` in this case)

        StackMob.init({
          publicKey : [your public key],
          proxyURL : 'http://[your StackMob hosted domain]/proxy.html', //note this line!
          apiVersion : 0
        });

7.  run `http://127.0.0.1:4567/client.html` as if you were developing from there and make regular JS SDK calls

**You must make calls after the iframe loads**:

```
$(document).ready(function() { //wait for the iframe tag to load
  $('#proxy').load(function() { //wait for the contents of the iframe to load
    
    //now you're ready to start making cross domain calls
    
    //MAKE SDK CALLS HERE
    
        //This looks like an ordinary JS SDK call, but behind the scenes it's using postMessage
        //to tell the iframe's JS SDK to make the call on its behalf.
        var users = new StackMob.Users();
        var q = new StackMob.Collection.Query();
        users.query(q, {
          //when the iframe's JS SDK gets a response, it'll pass it back to your JS SDK...
          //which in turn processes the response and calls success/error as expected
          success : function(model, response, options) {
            console.debug(model.toJSON());
          },
          error : function(model, response, options) {
            console.debug(response);
          }
        });    
  });
});
```

## Running the Example

Run your `client.html` (or whatever you've named it) on `http://127.0.0.1:4567` since that's the currently whitelisted domain.  OR, roll your own proxy.html and change the whitelisted domain.

Don't forget to initialize your `proxyURL` and your `publicKey`.  The given URL and key settings are my personal account.
