/* =========================================================
   ANILOKA — MINIMAL ROUTER
   -----------------------------------------------------------
   A small Express-style router built on Node's raw http
   module. Supports :params, middleware chains, and async
   handlers with centralized error handling.
   ========================================================= */

function pathToRegex(pathPattern) {
  const paramNames = [];
  const regexStr = pathPattern
    .replace(/\/:([A-Za-z0-9_]+)/g, (_, name) => { paramNames.push(name); return "/([^/]+)"; })
    .replace(/\*/g, ".*");
  return { regex: new RegExp(`^${regexStr}/?$`), paramNames };
}

class Router {
  constructor() {
    this.routes = []; // { method, regex, paramNames, handlers }
  }

  _add(method, pathPattern, handlers) {
    const { regex, paramNames } = pathToRegex(pathPattern);
    this.routes.push({ method, regex, paramNames, handlers });
  }

  get(p, ...h) { this._add("GET", p, h); }
  post(p, ...h) { this._add("POST", p, h); }
  put(p, ...h) { this._add("PUT", p, h); }
  patch(p, ...h) { this._add("PATCH", p, h); }
  delete(p, ...h) { this._add("DELETE", p, h); }

  /** Try to handle a request. Returns true if a route matched (and was handled), false otherwise. */
  async handle(req, res, pathname) {
    for (const route of this.routes) {
      if (route.method !== req.method) continue;
      const match = route.regex.exec(pathname);
      if (!match) continue;

      req.params = {};
      route.paramNames.forEach((name, i) => { req.params[name] = decodeURIComponent(match[i + 1]); });

      let i = 0;
      const runNext = async () => {
        if (i >= route.handlers.length) return;
        const handler = route.handlers[i++];
        await handler(req, res, runNext);
      };
      try {
        await runNext();
      } catch (err) {
        req.app_error = err;
        throw err;
      }
      return true;
    }
    return false;
  }
}

module.exports = { Router };
