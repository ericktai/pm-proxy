StackMob Cross Domain Proxy - window.postMessage
========

## Overview

StackMob's JavaScript SDK uses AJAX to communicate with StackMob's API server: `https://api.stackmob.com`.  Normally cross domain AJAX calls are blocked by browsers' same-domain origin policies.  `https://mysite.com` normally can't make AJAX calls to `https://api.stackmob.com`.  But because StackMob supports HTML5's CORS (cross origin resource sharing), CORS is a valid solution for many people.  However CORS support isn't supported on all browsers (IE).  This is an alternative.

## Files needed

The approach involves three files:

1. `proxy.html` - a static file on StackMob's HTML hosting service that is provided here
2. `client.html` - any of your HTML pages, represented by `client.html` in this example
3. `stackmob-proxy.js` - a static StackMob JavaScript file - included in your HTML file

## How it works

An HTML5 feature called `postMessage` lets two windows/frames within your browser to talk to each other.  We'll load an iframe on your HTML page, and that iframe will contain a page on StackMob's hosted server.  That iframe page is now technically on the same domain and can make same-domain AJAX calls with no special CORS settings.  It's just a regular AJAX call, thereby offering you the widest browser support.

Your page will use a modified version of the StackMob JS SDK that uses `postMessage` to communicate with the iframe to make AJAX calls on your behalf.  With `postMessage`, the two windows will communicate with each other, passing request and response information between them, and your StackMob JS SDK will effectively have the same behavior.

## Installation Instructions

1.  Include `stackmob-proxy.js` in your HTML pages after you've included the StackMob JS SDK.  It's an extension.
        ```js
        asdf
        ```

## Requirements

This HTML file helps enable cross domain AJAX calls via HTML5's `window.postMessage` feature.

This is the complementary file to stackmob-proxy-x.x.x.js.  They work together.
This file should sit on a StackMob hosted server.


* ****************** WHAT DO I NEED TO CHANGE? ******************
* Change StackMob.init({...}) to your app's information
* ****************** WHERE DO I PUT THIS FILE? ******************
* This HTML file should live on a StackMob hosted server on the server-side, alongside your other HTML files.  (So go ahead and stick it in your GitHub repo).  It can be in any folder.
* E.g.,
*
* //Put it on any hosted StackMob site
* http://yourapp.yoursubdomain.stackmobapp.com/proxy-0.3.0.html
* http://www.yourdomain.com/proxy-0.3.0.html  <-- assuming this is StackMob hosted using our custom domains feature
*.
*
***********************************************************
***********************************************************
