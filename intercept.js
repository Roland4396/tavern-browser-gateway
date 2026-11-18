(function (factory) {
  "use strict";
  if (typeof module === "object" && module.exports) {
    module.exports = factory;
    return;
  }
  factory().install(window, document);
})(function createStreamShell() {
  "use strict";

  var PRIVATE_HOSTS = {
    "127.0.0.1:3002": true,
    "localhost:3002": true,
    "stream-proxy:3002": true,
  };
  var PATH_ALIASES = {
    "/models": "/v1/models",
    "/chat/completions": "/v1/chat/completions",
    "/messages": "/v1/messages",
    "/audio/speech": "/v1/audio/speech",
    "/audio/voices": "/v1/audio/voices",
    "/v1/models": "/v1/models",
    "/v1/chat/completions": "/v1/chat/completions",
    "/v1/messages": "/v1/messages",
    "/v1/audio/speech": "/v1/audio/speech",
    "/v1/audio/voices": "/v1/audio/voices",
  };

  function normalizePrefix(prefix) {
    if (!prefix || prefix === "/") return "";
    return "/" + String(prefix).replace(/^\/+|\/+$/g, "");
  }

  function createRewriter(origin, prefix) {
    var normalizedOrigin = new URL(origin).origin;
    var appPrefix = normalizePrefix(prefix);

    return function rewrite(rawUrl) {
      var parsed;
      try {
        parsed = new URL(String(rawUrl), normalizedOrigin + appPrefix + "/");
      } catch (_error) {
        return rawUrl;
      }

      var sameOrigin = parsed.origin === normalizedOrigin;
      if (sameOrigin && appPrefix && parsed.pathname.indexOf(appPrefix + "/v1/") === 0) {
        return parsed.href;
      }

      var normalizedPath = PATH_ALIASES[parsed.pathname];
      var privateOrigin = parsed.protocol === "http:" || parsed.protocol === "https:"
        ? Boolean(PRIVATE_HOSTS[parsed.host])
        : false;
      var sameOriginRootApi = sameOrigin && Boolean(normalizedPath);
      if (!normalizedPath || (!privateOrigin && !sameOriginRootApi)) {
        return parsed.href;
      }

      return normalizedOrigin + appPrefix + normalizedPath + parsed.search + parsed.hash;
    };
  }

  function scriptPrefix(documentObject) {
    var script = documentObject.currentScript;
    if (!script || !script.src) return "";
    try {
      var path = new URL(script.src, documentObject.baseURI).pathname;
      var marker = "/__stream_shell.js";
      return path.endsWith(marker) ? path.slice(0, -marker.length) : "";
    } catch (_error) {
      return "";
    }
  }

  function install(windowObject, documentObject) {
    if (windowObject.__streamShellInstalled) return;
    Object.defineProperty(windowObject, "__streamShellInstalled", { value: true });

    var rewrite = createRewriter(windowObject.location.origin, scriptPrefix(documentObject));
    var nativeFetch = windowObject.fetch;
    if (typeof nativeFetch === "function") {
      windowObject.fetch = function streamShellFetch(input, init) {
        if (typeof windowObject.Request === "function" && input instanceof windowObject.Request) {
          var requestUrl = rewrite(input.url);
          if (requestUrl !== input.url) input = new windowObject.Request(requestUrl, input);
        } else if (typeof input === "string" || (input && typeof input.href === "string")) {
          input = rewrite(input.href || input);
        }
        return nativeFetch.call(this, input, init);
      };
    }

    var xhr = windowObject.XMLHttpRequest;
    if (xhr && xhr.prototype && typeof xhr.prototype.open === "function") {
      var nativeOpen = xhr.prototype.open;
      xhr.prototype.open = function streamShellOpen(method, url) {
        var args = Array.prototype.slice.call(arguments);
        args[1] = rewrite(url);
        return nativeOpen.apply(this, args);
      };
    }

    Object.defineProperty(windowObject, "__streamShellRewriteUrl", { value: rewrite });
  }

  return {
    createRewriter: createRewriter,
    install: install,
  };
});
