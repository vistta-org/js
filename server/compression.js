import accepts from "accepts";
import { Buffer } from "safe-buffer";
import bytes from "bytes";
import compressible from "compressible";
import onHeaders from "on-headers";
import vary from "vary";
import zlib from "zlib";

const cacheControlNoTransformRegExp = /(?:^|,)\s*?no-transform\s*?(?:,|$)/;
const CONTENT_LENGTH = "Content-Length";

function compression(options) {
  let opts = options || {};
  // options
  let threshold = bytes.parse(opts.threshold);
  //
  if (threshold == null) threshold = 1024;
  return function compression(req, res, next) {
    let ended = false;
    let length;
    let listeners = [];
    let stream;
    let _end = res.end;
    let _on = res.on;
    let _write = res.write;
    // flush
    res.flush = function flush() {
      if (stream) stream.flush();
    };
    // proxy
    res.write = function write(chunk, encoding) {
      if (ended) return false;
      if (!this._header) this.writeHead(this.statusCode);
      return stream
        ? stream.write(toBuffer(chunk, encoding))
        : _write.call(this, chunk, encoding);
    };
    res.end = function end(chunk, encoding) {
      if (ended) return false;
      if (!this._header) {
        // estimate the length
        if (!this.getHeader(CONTENT_LENGTH)) {
          length = chunkLength(chunk, encoding);
        }
        this.writeHead(this.statusCode);
      }
      if (!stream) return _end.call(this, chunk, encoding);
      // mark ended
      ended = true;
      // write Buffer for Node.js 0.8
      return chunk ? stream.end(toBuffer(chunk, encoding)) : stream.end();
    };

    res.on = function on(type, listener) {
      if (!listeners || type !== "drain") return _on.call(this, type, listener);
      if (stream) return stream.on(type, listener);
      // buffer listeners for future stream
      listeners.push([type, listener]);
      return this;
    };

    function nocompress() {
      addListeners(res, _on, listeners);
      listeners = null;
    }

    onHeaders(res, function onResponseHeaders() {
      if (!filter(req, res) || !shouldTransform(req, res)) {
        nocompress();
        return;
      }
      // vary
      vary(res, "Accept-Encoding");
      // content-length below threshold
      if (
        Number(res.getHeader(CONTENT_LENGTH)) < threshold ||
        length < threshold
      ) {
        nocompress();
        return;
      }
      let encoding = res.getHeader("Content-Encoding") || "identity";
      // already encoded
      if (encoding !== "identity" || req.method === "HEAD") {
        nocompress();
        return;
      }
      // compression method
      let accept = accepts(req);
      let method = accept.encoding(["gzip", "deflate", "identity"]);
      // we really don't prefer deflate
      if (method === "deflate" && accept.encoding(["gzip"])) {
        method = accept.encoding(["gzip", "identity"]);
      }
      // negotiation failed
      if (!method || method === "identity") {
        nocompress();
        return;
      }
      stream =
        method === "gzip" ? zlib.createGzip(opts) : zlib.createDeflate(opts);
      addListeners(stream, stream.on, listeners);
      res.setHeader("Content-Encoding", method);
      res.removeHeader(CONTENT_LENGTH);
      stream.on("data", function onStreamData(chunk) {
        if (_write.call(res, chunk) === false) stream.pause();
      });
      stream.on("end", function onStreamEnd() {
        _end.call(res);
      });
      _on.call(res, "drain", function onResponseDrain() {
        stream.resume();
      });
    });

    next();
  };
}

function addListeners(stream, on, listeners) {
  for (let i = 0; i < listeners.length; i++) {
    on.apply(stream, listeners[i]);
  }
}

function chunkLength(chunk, encoding) {
  if (!chunk) return 0;
  return !Buffer.isBuffer(chunk)
    ? Buffer.byteLength(chunk, encoding)
    : chunk.length;
}

function filter(req, res) {
  let type = res.getHeader("Content-Type");
  return (
    !req.headers["x-no-compression"] &&
    !(type === undefined || !compressible(type))
  );
}

function shouldTransform(req, res) {
  let cacheControl = res.getHeader("Cache-Control");
  return !cacheControl || !cacheControlNoTransformRegExp.test(cacheControl);
}

function toBuffer(chunk, encoding) {
  return !Buffer.isBuffer(chunk) ? Buffer.from(chunk, encoding) : chunk;
}

export default compression;
