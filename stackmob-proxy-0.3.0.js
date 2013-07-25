/**
 * Start of Cross-Domain plugin
 * 
 * 
 */
_.extend(StackMob, {

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

      window.addEventListener('message', function(event) {
        if(event.origin == "http://dev.proxyexperiment.tai.stackmobapp.com") {

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
    var success = params['success'];
    var error = params['error'];

    var defaultSuccess = function(model) {
      var result;
      if(model && model.toJSON) {
        result = model;
      } else if(model && (model.responseText || model.text)) {
        var json = JSON.parse(model.responseText || model.text);
        result = json;
      } else if(model) {
        result = model;
      }

      if(_.isFunction(params['stackmob_on' + method]))
        params['stackmob_on' + method]();

      if(success) {
        success(result);
      }
    };
    var defaultError = function(status, response) {
      var data = response;

      (function(m, d) {
        if(error)
          error(d);
      }).call(StackMob, model, data);
    }
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
      StackMob['proxyframe'].contentWindow.postMessage(JSON.stringify(payload), 'http://dev.proxyexperiment.tai.stackmobapp.com');
    else
      throwError('No proxy frame found.');
  }
});