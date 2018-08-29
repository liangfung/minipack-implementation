(function (modules) {
  function require(id) {
    const [fn, mapping] = modules[id]
    function localRequire(path) {
      const id = mapping[path]
      return require(id)
    }
    const module = { exports: {} }
    fn(localRequire, module, module.exports)

    return module.exports
  }
  require(0)
})({
  0: [
    (function (require, module, exports) {
      "use strict";

      var _message = require("./message.js");

      console.log('message: ' + _message.message);
    }),
    { "./message.js": 1 }
  ], 1: [
    (function (require, module, exports) {
      "use strict";

      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      var message = exports.message = 'hello world';
    }),
    {}
  ],
})