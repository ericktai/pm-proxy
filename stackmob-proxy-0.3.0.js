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
  getBaseURL: function() { return this.hostedDomain + '/'; },

  initStart : function(options) {
    if(options['proxy']) {
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

      window.addEventListener('message', function(event) {
        if(event.origin == ("http://" + dis.hostedDomain)) {

          var payload = JSON.parse(event.data);

          var result = payload['result'];
          var response = payload['response'];
          var status = payload['status'];
          var call_id = payload['call_id'];

          if(result === 'success') {
            StackMob['callLog'][call_id]['success'](response);
          } else {
            StackMob['callLog'][call_id]['error'](StackMob['callLog'][call_id]['model'], response);
          }

          //Cleanup
          StackMob['callLog'][call_id]['success'] = null;
          StackMob['callLog'][call_id]['error'] = null;
          StackMob['callLog'][call_id]['model'] = null;
          delete StackMob['callLog'][call_id];
        }
      }, false);
    }
  },
  callLog : {},

  'ajax' : function(model, params, method) {
    var originalSuccess = params['success'];
    var originalError = params['error'];
    
    var wrappedSuccess = function(response, status, xhr) {
      var result;

      if(params["stackmob_count"] === true) {
        result = xhr;
      } else if(response && response.toJSON) {
        result = response;
      } else if(response && (response.responseText || response.text)) {
        var result;

        try {
          result = JSON.parse(response.responseText || response.text);
        } catch (e) {
          result = response.responseText || response.text;
        }
      } else if(response) {
        result = response;
      }
      StackMob.onsuccess(model, method, params, result, success, options);

    };
    
    params['success'] = defaultSuccess;



    params['error'] = function(jqXHR, textStatus, errorThrown) {
      // Workaround for Android broswers not recognizing HTTP status code 206.
      // Call the success method on HTTP Status 0 (the bug) and when a range was specified.
      if (jqXHR.status === 0 && params['query'] && (typeof params['query']['range'] === 'object')){
        this.success(jqXHR, textStatus, errorThrown);
        return;
      }
      var responseText = jqXHR.responseText || jqXHR.text;
      StackMob.onerror(jqXHR, responseText, $.ajax, model, params, error, options);
    };

    var call_id = (new Date()).getTime() + '_' + method;

    //collections vs. models.
    if(model.getPrimaryKeyField)
      call_id += '_' + model.get(model.getPrimaryKeyField());

    StackMob['callLog'][call_id] = {};

    StackMob['callLog'][call_id]['success'] = defaultSuccess;
    StackMob['callLog'][call_id]['error'] = defaultError;
    StackMob['callLog'][call_id]['model'] = model;

    var payload = {
      'call_id' : call_id,
      'params' : params
    };

    if(StackMob['proxyframe'])
      StackMob['proxyframe'].contentWindow.postMessage(JSON.stringify(payload), ('http://' + this.hostedDomain));
    else
      throwError('No proxy frame found.');
  }
});