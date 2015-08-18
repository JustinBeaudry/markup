// Markup
(function(window) {
  'use strict';

  var NAME = 'Markup';
  var PREFIX = window._MARKUP_PREFIX || 'mu';

  function newError(error) {
    return new Error('[' + NAME + '] ' + error);
  }

  function extend(obj, props) {
    for(var prop in props) {
      if (props.hasOwnProperty(prop)) {
        obj[prop] = props[prop];
      }
    }
  }

  var Markup = function MarkupSuper() {

    var _UID = 0;
    function nextUid() {
      return _UID++;
    }

    var registeredSpecials = {
      repeat: repeat
    };

    var settings = {
      throwOnError: false
    };

    var root;
    var bindings = [];
    var specials = [];

    function getBindingsAndSpecials(nodes) {
      Array.prototype.forEach.call(nodes, function(node) {
        if (node.dataset instanceof DOMStringMap) {
          Object.keys(node.dataset).forEach(function(key) {
            if (new RegExp('^' + PREFIX).test(key)) {
              specials.push({
                node: node,
                name: key.slice(key.indexOf(PREFIX) + PREFIX.length).toLowerCase(),
                action: node.dataset[key] || null
              });
            } else {
              bindings.push(node);
            }
          });
        }
      });
    }

    // Context
    function Context() {
      this.$id = nextUid();
      this.$root = this;
    }

    function createChildContext(parent) {
      function ChildContext() {
        this.$id = nextUid();
        this.$ChildContext = null;
      }
      ChildContext.prototype = parent;
      return ChildContext;
    }

    Context.prototype = {
      constructor: Context,
      $new: function(isolate, parent) {
        var child;

        parent = parent || this;

        if (isolate) {
          child = new Context();
          child.$root = this.$root;
        } else {
          if (!this.$ChildContext) {
            this.$ChildContext = createChildContext(this);
          }
          child = new this.$ChildContext();
        }

        child.$parent = parent;

        return child;
      }
    };

    this.RootContext = new Context();

    this.init = function initMarkup(data, opts) {

      opts = opts || {};

      if (opts.specials && typeof opts.specials === 'object') {
        extend(registeredSpecials, opts.specials);
        delete opts.specials;
      }

      extend(settings, opts);

      if (!document.querySelectorAll) {
        throw newError('your browser does not support querySelectorAll');
      }

      // setup new context from RootContext
      this.$context = this.RootContext.$new();
      extend(this.$context, data);

      root = document.querySelectorAll('[data-' + PREFIX + '-tmpl');

      // @TODO:  Custom HTML Elements

      if (!root || root.length === 0) {
        throw newError('Markup templates requires a `data-' + PREFIX + '-tmpl` attribute on the root node');
      }
      else if (root.length > 1) {
        throw newError('Markup templates currently only supports one root node');
      }
      else {
        root = root[0];
        if (root.childNodes.length < 1) {
          throw newError('no markup bindings present within root node');
        }
        this.compile();
      }
    };

    this.compile = function() {

      if (!this.$context) {
        throw newError('markup.init must be called before trying to compile');
      }

      var self = this;
      if (root) {
        getBindingsAndSpecials(root.childNodes);
        if (bindings.length > 0) {
          if (specials.length > 0) {
            specials.forEach(function(special) {
              if (Object.keys(registeredSpecials).indexOf(special.name) >= 0) {
                registeredSpecials[special.name](special, self.$context);
              }
            });
          }
          this.render();
        }
      }
    };

    this.render = function() {
      var self = this;
      if (root && bindings.length > 0) {
        Array.prototype.forEach.call(bindings, function(bind) {
          Object.keys(self.$context).forEach(function(key) {
            if (bind.dataset.hasOwnProperty(key)) {
              bind.innerHTML = self.$context[key];
            }
          });
        });
      }
    };

    function repeat(special, context) {
      var elem = special.node,
        action = special.action,
        actionParts = [],
        repeatedNode,
        newContext,
        array,
        total,
        data,
        newNode,
        i;

      if (action.indexOf('in') < 0) {
        console.warn('element removed from DOM');
        elem.remove();
        if (settings.throwOnError) {
          throw newError('data-' + PREFIX + '-repeat actions in markup must be formatted as follows: `{elementName} in {arrayName}`');
        }
        console.error(newError('data-' + PREFIX + '-repeat actions in markup must be formatted as follows: `{elementName} in {arrayName}`'));
        return false;
      }

      actionParts = action.split(' ');
      actionParts = actionParts.map(function(part) {
        return part.replace(/ /g, '');
      });

      newContext = actionParts[0];
      array = actionParts[2];

      if (!context.hasOwnProperty(array)) {
        if (settings.throwOnError) {
          throw newError(array + ' was not found in context');
        }
        console.error(newError(array + ' was not found in context'));
        return false;
      }

      if(!Array.isArray(context[array])) {
        if (settings.throwOnerror) {
          throw newError('only supports arrays for now')
        }
        console.error(newError('only supports arrays for now'));
        return false;
      }

      total = context[array].length;
      data = context[array];

      Array.prototype.forEach.call(elem.childNodes, function(node) {
        console.info(node, node.dataset, newContext);
        if (node.dataset && node.dataset.hasOwnProperty(newContext)) {
          if (!repeatedNode) {
            console.info(node);
            repeatedNode = node;
            return false;
          }
        }
      });

      if (total > 1) {
        for (i = 0; i < total; i++) {
          // on first pass insert value into existing element
          if (i === 0) {
            repeatedNode.innerHTML = data[i];
          } else {
            newNode = repeatedNode.cloneNode();
            newNode.innerHTML = data[i];
            elem.appendChild(newNode);
          }
        }
      } else {
        repeatedNode.innerHTML = data[0];
      }
    }
  };

  window.markup = new Markup();
})(window)
