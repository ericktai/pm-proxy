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
        //you will need to change this to https if your proxyURL is https
        if(event.origin == ("http://" + dis.hostedDomain)) {

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

          //Cleanup
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
    
    //save the original success/error calls.  we're going to overwrite them to deal with the 
    //postMessage callbacks
    var originalSuccess = params['success'];
    var originalError = params['error'];

    //change the success function so that we can process things in the postMessage callbacks above
    var delayedSuccess = function(result, response, status) {
      StackMob.onsuccess(model, method, params, response, originalSuccess, options);
    };
    params['success'] = delayedSuccess;

    //change the error function so that we can process things in the postMessage callbacks above
    var delayedError = function(result, response, status, statusCode) {
      var jqXHR = {
        status : statusCode
      };
      var responseAsString = JSON.stringify(response);
      StackMob.onerror(jqXHR, responseAsString, $.ajax, model, params, originalError, options);
    };
    
    params['error'] = delayedError;

    //generate an ID for this call so that we can keep track of the outbound proxied requests
    var call_id = (new Date()).getTime() + '_' + method;

    //collections vs. models.
    if(model.getPrimaryKeyField)
      call_id += '_' + model.get(model.getPrimaryKeyField());


    StackMob['callLog'][call_id] = {};

    StackMob['callLog'][call_id]['success'] = delayedSuccess;
    StackMob['callLog'][call_id]['error'] = delayedError;
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
