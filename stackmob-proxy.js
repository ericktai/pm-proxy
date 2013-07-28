/**
 * Currently based on StackMob JS SDK 0.9.2
 *
 *
 */
_.extend(StackMob, {

  parseDomain : function(url) {
    var url = $.trim(url);
    if(url.search(/^https?\:\/\//) != -1)
      url = url.match(/^https?\:\/\/([^\/?#]+)(?:[\/?#]|$)/i, "");
    else
      url = url.match(/^([^\/?#]+)(?:[\/?#]|$)/i, "");
    return url[1];
  },
  //setting this so that OAuth 2.0 requests are signed with the proxy frame's URL
  //this is consumed by Authorization generating methods
  getBaseURL : function() {
    return this.getHostedDomain() + '/';
  },
  //get the domain at which the iframe page lives
  getHostedDomain : function() {
    this.hostedDomain = this.hostedDomain || this.parseDomain(this.proxyURL);
    return this.hostedDomain;
  },
  //fired when initializing the StackMob JS SDK
  initStart : function(options) {
    //if a proxyURL is defined, let's setup the iframe
    if(options['proxyURL']) {
      this.proxyURL = options['proxyURL'];

      //Auto add an iframe to hold the remote HTML page
      var frame = document.createElement('iframe');
      frame.setAttribute('src', this.proxyURL || throwError('No proxy frame URL provided.'));
      frame.setAttribute('id', 'proxy');
      frame.setAttribute('width', '0px');
      frame.setAttribute('height', '0px');
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('style', 'display: none;');

      //add the iframe to the page
      $(document).ready(function() {
        document.body.appendChild(frame);
      });

      this.proxyframe = frame;

      var dis = this;

      //callback

      //have a postmessage listener that listens to messages sent back from the iframe
      window.addEventListener('message', function(event) {
        //only listen to calls from the iframe domain
        var scheme = dis.proxyURL.indexOf('https://') == -1 ? 'http://' : 'https://';
        if(event.origin == (scheme + dis.hostedDomain)) {

          //this should include the response and other call details from the iframe JS SDK ajax request.
          var payload = JSON.parse(event.data);

          var result = payload['result'];
          var response = JSON.parse(payload['response']);
          var statusCode = payload['statusCode'];
          var status = payload['status'];
          var call_id = payload['call_id'];

          //process the response in your local StackMob JS SDK's internals
          if(result === 'success') {
            StackMob['callLog'][call_id]['success'](result, response, status);
          } else {
            StackMob['callLog'][call_id]['error'](result, response, status, statusCode);
          }

          //Cleanup call logs since we don't need to keep track of this anymore.
          //TODO: maybe in the case of 503 (custom code is starting up) or 302 (API redirect),
          //we will need to keep this around.
          delete StackMob['callLog'][call_id]['success'];
          delete StackMob['callLog'][call_id]['error'];
          delete StackMob['callLog'][call_id]['model'];
          delete StackMob['callLog'][call_id]['options'];
          delete StackMob['callLog'][call_id];
        }
      }, false);
    }
  },
  //a map to keep track of the calls that are proxied out so that when the iframe responds, we can
  //tie them back to their original request details - including the model, method, and options that were used
  callLog : {},

  //override the AJAX call to instead make a postMessage call to the iframe
  'ajax' : function(model, params, method, options) {

    //get pointers to the original success/error calls.
    var originalSuccess = params['success'];
    var originalError = params['error'];

    //change the success function so that we can process things in the postMessage callbacks above
    var processProxySuccess = function(result, response, status) {
      //when the proxy tells us it's done via a postMessage, then let's process the results
      //via the StackMob JS SDK as we normally do.
      StackMob.onsuccess(model, method, params, response, originalSuccess, options);
    };
    //change the error function so that we can process things in the postMessage callbacks above
    var processProxyError = function(result, response, status, statusCode) {

      //because we aren't using AJAX, we're fudging things around here so that it will adhere to
      //the existing StackMob.onerror(..) signature
      var jqXHR = {
        status : statusCode
      };
      var responseAsString = JSON.stringify(response);

      //when the proxy tells us it's done via a postMessage, then let's process the results
      //via the StackMob JS SDK as we normally do.
      StackMob.onerror(jqXHR, responseAsString, $.ajax, model, params, originalError, options);
    };
    //generate an ID for this call so that we can keep track of the outbound proxied requests
    var call_id = (new Date()).getTime() + '_' + method;

    //collections vs. models.
    if(model.getPrimaryKeyField)
      call_id += '_' + model.get(model.getPrimaryKeyField());

    //save a reference to this outbound call so that when the iframe returns with the response, we
    //can look it up and call the proper success/error methods, models, and options
    StackMob['callLog'][call_id] = {};
    StackMob['callLog'][call_id]['success'] = processProxySuccess;
    StackMob['callLog'][call_id]['error'] = processProxyError;
    StackMob['callLog'][call_id]['model'] = model;
    StackMob['callLog'][call_id]['options'] = options;

    //params contains serializable information about the AJAX request, like how jQuery has $.ajax(params)
    //send these call details to the iframe so that the iframe can make the call on your behalf
    var payload = {
      'call_id' : call_id,
      'params' : params
    };

    if(StackMob['proxyframe']) {
      //send the proxy call to the iframe
      StackMob['proxyframe'].contentWindow.postMessage(JSON.stringify(payload), ('http://' + this.getHostedDomain()));
    } else
      throwError('No proxy frame found.');
  }
});
