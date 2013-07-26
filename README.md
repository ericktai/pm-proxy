Making StackMob cross domain calls without CORS
========

## Overview

StackMob's JavaScript SDK uses AJAX to communicate with StackMob's API server: `https://api.stackmob.com`.  Normally cross domain AJAX calls are blocked by browsers' same-domain origin policies.  `https://mysite.com` normally can't make AJAX calls to `https://api.stackmob.com`.  But because StackMob supports HTML5's CORS (cross origin resource sharing), CORS is a valid solution for many people.  However CORS support isn't supported on all browsers (IE).  This is an alternative.

## What's needed

The approach involves three files:

1. `proxy.html` - a static file on StackMob's HTML hosting service that is provided here
2. `client.html` - any of your HTML pages, represented by `client.html` in this example
3. `stackmob-proxy.js` - a static StackMob JavaScript file - included in your HTML file

**You also need to use StackMob's Hosting service** because it can support the AJAX calls properly (special logic on StackMob web servers).  Only `proxy.html` needs to be on the hosting service.  All your other HTML files can live on your servers.

## How it works

An HTML5 feature called `postMessage` lets two windows/frames within your browser to talk to each other.  We'll load an iframe on your HTML page, and that iframe will contain a page on StackMob's hosted server.  That iframe page is now technically on the same domain and can make same-domain AJAX calls with no special CORS settings.  It's just a regular AJAX call, thereby offering you the widest browser support.

Your page will use a modified version of the StackMob JS SDK that uses `postMessage` to communicate with the iframe to make AJAX calls on your behalf.  With `postMessage`, the two windows will communicate with each other, passing request and response information between them, and your StackMob JS SDK will effectively have the same behavior.

## Installation Instructions

1.  Install the StackMob HTML Hosting service (only used for `proxy.html`, not your web files)
2.  Initialize the StackMob JS SDK in `proxy.html`
    ```
          StackMob.init({
            publicKey : [your public key],
            useRelativePathForAjax : true, //note this line!
            apiVersion : 0
          });
    ```
3.  Modify the `whiteListedDomain` in `proxy.html`.  If your domain is `http://www.mysite.com` then:
        ```
        var whiteListedDomain = 'http://www.mysite.com';
        ```
4.  Deploy `proxy.html` to the hosting service - it's now on the web
5.  Include `stackmob-proxy.js` in **your** HTML pages immediately after the included StackMob JS SDK.  It's an extension.
        ```
        <script type="text/javascript" src="http://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
        <script type="text/javascript" src="http://static.stackmob.com/js/stackmob-js-0.9.1-bundled-min.js"></script>
        <script type="text/javascript" src="stackmob-proxy.js"></script>
        ```
6.  Initialize your pages' StackMob JS SDK
        ```
        StackMob.init({
          publicKey : [your public key],
          proxyURL : 'http://[your StackMob hosted domain]/proxy.html', //note this line!
          apiVersion : 0
        });
        ```
7.  Start making JS SDK calls as you normally would!
