/**
 * Start of Cross-Domain plugin
 * 
 * 
 */
_.extend(StackMob, {

  /**
  Change this domain to the domain of your proxy.html

  e.g. my file lives at http://dev.proxyexperiment.tai.stackmobapp.com/proxy-0.3.0.html
  */
  getBaseURL: function() { return this.getHostedDomain() + '/'; },

  getHostedDomain: function() { return this.hostedDomain; },

  initStart : function(options) {
    if(options['proxy']) {

      //Auto add an iframe to hold the remote HTML page
      var frame = document.createElement('iframe');
      frame.setAttribute('src', options['proxy'] || throwError('No proxy frame URL provided.'));
      frame.setAttribute('id', 'theiframe');
      frame.setAttribute('width', '0px');
      frame.setAttribute('height', '0px');
      frame.setAttribute('frameborder', '0');
      frame.setAttribute('style', 'display: none;');

      $(document).ready(function() {
        document.body.appendChild(frame);
      });

      this.proxyframe = frame;

      var dis = this;

      //callback

      window.addEventListener('message', function(event) {
        if(event.origin == ("http://" + dis.hostedDomain)) {

          var payload = JSON.parse(event.data);

          var result = payload['result'];
          var response = JSON.parse(payload['response']);
          var statusCode = payload['statusCode'];
          var status = payload['status'];
          var call_id = payload['call_id'];


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

  callLog : {},

  'ajax' : function(model, params, method, options) {
    var originalSuccess = params['success'];
    var originalError = params['error'];
    
    var delayedSuccess = function(result, response, status) {
      StackMob.onsuccess(model, method, params, response, originalSuccess, options);
    };
    
    params['success'] = delayedSuccess;



    var delayedError = function(result, response, status, statusCode) {
      var jqXHR = { status: statusCode };
      var responseAsString = JSON.stringify(response);
      StackMob.onerror(jqXHR, responseAsString, $.ajax, model, params, originalError, options);
    };

    params['error'] = delayedError;


    var call_id = (new Date()).getTime() + '_' + method;

    //collections vs. models.
    if(model.getPrimaryKeyField)
      call_id += '_' + model.get(model.getPrimaryKeyField());

    StackMob['callLog'][call_id] = {};

    StackMob['callLog'][call_id]['success'] = delayedSuccess;
    StackMob['callLog'][call_id]['error'] = delayedError;
    StackMob['callLog'][call_id]['model'] = model;
    StackMob['callLog'][call_id]['options'] = options;

    var payload = {
      'call_id' : call_id,
      'params' : params
    };

    if(StackMob['proxyframe'])
      StackMob['proxyframe'].contentWindow.postMessage(
        JSON.stringify(payload), ('http://' + this.getHostedDomain()));
    else
      throwError('No proxy frame found.');
  }
});