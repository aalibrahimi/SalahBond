// Minimal polyfills for web APIs Hermes doesn't provide.
// Must be imported before anything else in the root layout.

if (typeof globalThis.DOMException === "undefined") {
  class DOMExceptionPolyfill extends Error {
    code: number;
    constructor(message = "", name = "Error") {
      super(message);
      this.name = name;
      this.code = 0;
    }
  }
  // @ts-expect-error assigning polyfill
  globalThis.DOMException = DOMExceptionPolyfill;
}

export {};
