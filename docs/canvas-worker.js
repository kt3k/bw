var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/alea.js
var require_alea = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/alea.js"(exports, module) {
    (function(global, module2, define2) {
      function Alea(seed) {
        var me = this, mash = Mash();
        me.next = function() {
          var t = 2091639 * me.s0 + me.c * 23283064365386963e-26;
          me.s0 = me.s1;
          me.s1 = me.s2;
          return me.s2 = t - (me.c = t | 0);
        };
        me.c = 1;
        me.s0 = mash(" ");
        me.s1 = mash(" ");
        me.s2 = mash(" ");
        me.s0 -= mash(seed);
        if (me.s0 < 0) {
          me.s0 += 1;
        }
        me.s1 -= mash(seed);
        if (me.s1 < 0) {
          me.s1 += 1;
        }
        me.s2 -= mash(seed);
        if (me.s2 < 0) {
          me.s2 += 1;
        }
        mash = null;
      }
      function copy(f, t) {
        t.c = f.c;
        t.s0 = f.s0;
        t.s1 = f.s1;
        t.s2 = f.s2;
        return t;
      }
      function impl(seed, opts) {
        var xg = new Alea(seed), state = opts && opts.state, prng = xg.next;
        prng.int32 = function() {
          return xg.next() * 4294967296 | 0;
        };
        prng.double = function() {
          return prng() + (prng() * 2097152 | 0) * 11102230246251565e-32;
        };
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      function Mash() {
        var n = 4022871197;
        var mash = function(data) {
          data = String(data);
          for (var i = 0; i < data.length; i++) {
            n += data.charCodeAt(i);
            var h = 0.02519603282416938 * n;
            n = h >>> 0;
            h -= n;
            h *= n;
            n = h >>> 0;
            h -= n;
            n += h * 4294967296;
          }
          return (n >>> 0) * 23283064365386963e-26;
        };
        return mash;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.alea = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xor128.js
var require_xor128 = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xor128.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.next = function() {
          var t = me.x ^ me.x << 11;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          return me.w ^= me.w >>> 19 ^ t ^ t >>> 8;
        };
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor128 = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xorwow.js
var require_xorwow = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xorwow.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var t = me.x ^ me.x >>> 2;
          me.x = me.y;
          me.y = me.z;
          me.z = me.w;
          me.w = me.v;
          return (me.d = me.d + 362437 | 0) + (me.v = me.v ^ me.v << 4 ^ (t ^ t << 1)) | 0;
        };
        me.x = 0;
        me.y = 0;
        me.z = 0;
        me.w = 0;
        me.v = 0;
        if (seed === (seed | 0)) {
          me.x = seed;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 64; k++) {
          me.x ^= strseed.charCodeAt(k) | 0;
          if (k == strseed.length) {
            me.d = me.x << 10 ^ me.x >>> 4;
          }
          me.next();
        }
      }
      function copy(f, t) {
        t.x = f.x;
        t.y = f.y;
        t.z = f.z;
        t.w = f.w;
        t.v = f.v;
        t.d = f.d;
        return t;
      }
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorwow = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xorshift7.js
var require_xorshift7 = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xorshift7.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var X = me.x, i = me.i, t, v, w;
          t = X[i];
          t ^= t >>> 7;
          v = t ^ t << 24;
          t = X[i + 1 & 7];
          v ^= t ^ t >>> 10;
          t = X[i + 3 & 7];
          v ^= t ^ t >>> 3;
          t = X[i + 4 & 7];
          v ^= t ^ t << 7;
          t = X[i + 7 & 7];
          t = t ^ t << 13;
          v ^= t ^ t << 9;
          X[i] = v;
          me.i = i + 1 & 7;
          return v;
        };
        function init(me2, seed2) {
          var j, w, X = [];
          if (seed2 === (seed2 | 0)) {
            w = X[0] = seed2;
          } else {
            seed2 = "" + seed2;
            for (j = 0; j < seed2.length; ++j) {
              X[j & 7] = X[j & 7] << 15 ^ seed2.charCodeAt(j) + X[j + 1 & 7] << 13;
            }
          }
          while (X.length < 8)
            X.push(0);
          for (j = 0; j < 8 && X[j] === 0; ++j)
            ;
          if (j == 8)
            w = X[7] = -1;
          else
            w = X[j];
          me2.x = X;
          me2.i = 0;
          for (j = 256; j > 0; --j) {
            me2.next();
          }
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.x = f.x.slice();
        t.i = f.i;
        return t;
      }
      function impl(seed, opts) {
        if (seed == null)
          seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.x)
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xorshift7 = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xor4096.js
var require_xor4096 = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/xor4096.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this;
        me.next = function() {
          var w = me.w, X = me.X, i = me.i, t, v;
          me.w = w = w + 1640531527 | 0;
          v = X[i + 34 & 127];
          t = X[i = i + 1 & 127];
          v ^= v << 13;
          t ^= t << 17;
          v ^= v >>> 15;
          t ^= t >>> 12;
          v = X[i] = v ^ t;
          me.i = i;
          return v + (w ^ w >>> 16) | 0;
        };
        function init(me2, seed2) {
          var t, v, i, j, w, X = [], limit = 128;
          if (seed2 === (seed2 | 0)) {
            v = seed2;
            seed2 = null;
          } else {
            seed2 = seed2 + "\0";
            v = 0;
            limit = Math.max(limit, seed2.length);
          }
          for (i = 0, j = -32; j < limit; ++j) {
            if (seed2)
              v ^= seed2.charCodeAt((j + 32) % seed2.length);
            if (j === 0)
              w = v;
            v ^= v << 10;
            v ^= v >>> 15;
            v ^= v << 4;
            v ^= v >>> 13;
            if (j >= 0) {
              w = w + 1640531527 | 0;
              t = X[j & 127] ^= v + w;
              i = 0 == t ? i + 1 : 0;
            }
          }
          if (i >= 128) {
            X[(seed2 && seed2.length || 0) & 127] = -1;
          }
          i = 127;
          for (j = 4 * 128; j > 0; --j) {
            v = X[i + 34 & 127];
            t = X[i = i + 1 & 127];
            v ^= v << 13;
            t ^= t << 17;
            v ^= v >>> 15;
            t ^= t >>> 12;
            X[i] = v ^ t;
          }
          me2.w = w;
          me2.X = X;
          me2.i = i;
        }
        init(me, seed);
      }
      function copy(f, t) {
        t.i = f.i;
        t.w = f.w;
        t.X = f.X.slice();
        return t;
      }
      ;
      function impl(seed, opts) {
        if (seed == null)
          seed = +/* @__PURE__ */ new Date();
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (state.X)
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.xor4096 = impl;
      }
    })(
      exports,
      // window object or global
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/tychei.js
var require_tychei = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/lib/tychei.js"(exports, module) {
    (function(global, module2, define2) {
      function XorGen(seed) {
        var me = this, strseed = "";
        me.next = function() {
          var b = me.b, c = me.c, d = me.d, a = me.a;
          b = b << 25 ^ b >>> 7 ^ c;
          c = c - d | 0;
          d = d << 24 ^ d >>> 8 ^ a;
          a = a - b | 0;
          me.b = b = b << 20 ^ b >>> 12 ^ c;
          me.c = c = c - d | 0;
          me.d = d << 16 ^ c >>> 16 ^ a;
          return me.a = a - b | 0;
        };
        me.a = 0;
        me.b = 0;
        me.c = 2654435769 | 0;
        me.d = 1367130551;
        if (seed === Math.floor(seed)) {
          me.a = seed / 4294967296 | 0;
          me.b = seed | 0;
        } else {
          strseed += seed;
        }
        for (var k = 0; k < strseed.length + 20; k++) {
          me.b ^= strseed.charCodeAt(k) | 0;
          me.next();
        }
      }
      function copy(f, t) {
        t.a = f.a;
        t.b = f.b;
        t.c = f.c;
        t.d = f.d;
        return t;
      }
      ;
      function impl(seed, opts) {
        var xg = new XorGen(seed), state = opts && opts.state, prng = function() {
          return (xg.next() >>> 0) / 4294967296;
        };
        prng.double = function() {
          do {
            var top = xg.next() >>> 11, bot = (xg.next() >>> 0) / 4294967296, result = (top + bot) / (1 << 21);
          } while (result === 0);
          return result;
        };
        prng.int32 = xg.next;
        prng.quick = prng;
        if (state) {
          if (typeof state == "object")
            copy(state, xg);
          prng.state = function() {
            return copy(xg, {});
          };
        }
        return prng;
      }
      if (module2 && module2.exports) {
        module2.exports = impl;
      } else if (define2 && define2.amd) {
        define2(function() {
          return impl;
        });
      } else {
        this.tychei = impl;
      }
    })(
      exports,
      typeof module == "object" && module,
      // present in node.js
      typeof define == "function" && define
      // present with an AMD loader
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/seedrandom.js
var require_seedrandom = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/seedrandom.js"(exports, module) {
    (function(global, pool, math) {
      var width = 256, chunks = 6, digits = 52, rngname = "random", startdenom = math.pow(width, chunks), significance = math.pow(2, digits), overflow = significance * 2, mask = width - 1, nodecrypto;
      function seedrandom2(seed, options, callback) {
        var key = [];
        options = options == true ? { entropy: true } : options || {};
        var shortseed = mixkey(flatten(
          options.entropy ? [seed, tostring(pool)] : seed == null ? autoseed() : seed,
          3
        ), key);
        var arc4 = new ARC4(key);
        var prng = function() {
          var n = arc4.g(chunks), d = startdenom, x = 0;
          while (n < significance) {
            n = (n + x) * width;
            d *= width;
            x = arc4.g(1);
          }
          while (n >= overflow) {
            n /= 2;
            d /= 2;
            x >>>= 1;
          }
          return (n + x) / d;
        };
        prng.int32 = function() {
          return arc4.g(4) | 0;
        };
        prng.quick = function() {
          return arc4.g(4) / 4294967296;
        };
        prng.double = prng;
        mixkey(tostring(arc4.S), pool);
        return (options.pass || callback || function(prng2, seed2, is_math_call, state) {
          if (state) {
            if (state.S) {
              copy(state, arc4);
            }
            prng2.state = function() {
              return copy(arc4, {});
            };
          }
          if (is_math_call) {
            math[rngname] = prng2;
            return seed2;
          } else
            return prng2;
        })(
          prng,
          shortseed,
          "global" in options ? options.global : this == math,
          options.state
        );
      }
      function ARC4(key) {
        var t, keylen = key.length, me = this, i = 0, j = me.i = me.j = 0, s = me.S = [];
        if (!keylen) {
          key = [keylen++];
        }
        while (i < width) {
          s[i] = i++;
        }
        for (i = 0; i < width; i++) {
          s[i] = s[j = mask & j + key[i % keylen] + (t = s[i])];
          s[j] = t;
        }
        (me.g = function(count) {
          var t2, r = 0, i2 = me.i, j2 = me.j, s2 = me.S;
          while (count--) {
            t2 = s2[i2 = mask & i2 + 1];
            r = r * width + s2[mask & (s2[i2] = s2[j2 = mask & j2 + t2]) + (s2[j2] = t2)];
          }
          me.i = i2;
          me.j = j2;
          return r;
        })(width);
      }
      function copy(f, t) {
        t.i = f.i;
        t.j = f.j;
        t.S = f.S.slice();
        return t;
      }
      ;
      function flatten(obj, depth) {
        var result = [], typ = typeof obj, prop;
        if (depth && typ == "object") {
          for (prop in obj) {
            try {
              result.push(flatten(obj[prop], depth - 1));
            } catch (e) {
            }
          }
        }
        return result.length ? result : typ == "string" ? obj : obj + "\0";
      }
      function mixkey(seed, key) {
        var stringseed = seed + "", smear, j = 0;
        while (j < stringseed.length) {
          key[mask & j] = mask & (smear ^= key[mask & j] * 19) + stringseed.charCodeAt(j++);
        }
        return tostring(key);
      }
      function autoseed() {
        try {
          var out;
          if (nodecrypto && (out = nodecrypto.randomBytes)) {
            out = out(width);
          } else {
            out = new Uint8Array(width);
            (global.crypto || global.msCrypto).getRandomValues(out);
          }
          return tostring(out);
        } catch (e) {
          var browser = global.navigator, plugins = browser && browser.plugins;
          return [+/* @__PURE__ */ new Date(), global, plugins, global.screen, tostring(pool)];
        }
      }
      function tostring(a) {
        return String.fromCharCode.apply(0, a);
      }
      mixkey(math.random(), pool);
      if (typeof module == "object" && module.exports) {
        module.exports = seedrandom2;
        try {
          nodecrypto = __require("crypto");
        } catch (ex) {
        }
      } else if (typeof define == "function" && define.amd) {
        define(function() {
          return seedrandom2;
        });
      } else {
        math["seed" + rngname] = seedrandom2;
      }
    })(
      // global: `self` in browsers (including strict mode and web workers),
      // otherwise `this` in Node and other environments
      typeof self !== "undefined" ? self : exports,
      [],
      // pool: entropy pool starts empty
      Math
      // math: package containing random, pow, and seedrandom
    );
  }
});

// ../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/index.js
var require_seedrandom2 = __commonJS({
  "../../Library/Caches/deno/deno_esbuild/seedrandom@3.0.5/node_modules/seedrandom/index.js"(exports, module) {
    var alea = require_alea();
    var xor128 = require_xor128();
    var xorwow = require_xorwow();
    var xorshift7 = require_xorshift7();
    var xor4096 = require_xor4096();
    var tychei = require_tychei();
    var sr = require_seedrandom();
    sr.alea = alea;
    sr.xor128 = xor128;
    sr.xorwow = xorwow;
    sr.xorshift7 = xorshift7;
    sr.xor4096 = xor4096;
    sr.tychei = tychei;
    module.exports = sr;
  }
});

// util/canvas-wrapper.ts
var CanvasWrapper = class {
  #ctx;
  constructor(canvas) {
    this.#ctx = canvas.getContext("2d");
  }
  drawImage(img, x, y) {
    this.#ctx.drawImage(img, x, y);
  }
  drawRect(x, y, w, h, color) {
    this.#ctx.fillStyle = color;
    this.#ctx.fillRect(x, y, w, h);
  }
  clear() {
    this.#ctx.clearRect(0, 0, this.#ctx.canvas.width, this.#ctx.canvas.height);
  }
  /** The width of the canvas */
  get width() {
    return this.#ctx.canvas.width;
  }
  /** The height of the canvas */
  get height() {
    return this.#ctx.canvas.height;
  }
  get ctx() {
    return this.#ctx;
  }
};

// util/constants.ts
var CELL_SIZE = 16;
var BLOCK_SIZE = 200;
var BLOCK_CHUNK_SIZE = 20;

// util/random.ts
var import_npm_seedrandom = __toESM(require_seedrandom2());
var rng = (0, import_npm_seedrandom.default)("Hello.");

// util/math.ts
function ceilN(x, n) {
  return Math.ceil(x / n) * n;
}

// model/field-block.ts
var FieldCell = class {
  #color;
  #src;
  #canEnter;
  #name;
  constructor(name, canEnter, color, src) {
    this.#name = name;
    this.#canEnter = canEnter;
    this.#color = color;
    this.#src = src;
  }
  canEnter() {
    return this.#canEnter;
  }
  get name() {
    return this.#name;
  }
  get color() {
    return this.#color;
  }
  get src() {
    return this.#src;
  }
};
var BlockMap = class _BlockMap {
  /** The URL of the map */
  url;
  // The column of the world coordinates
  i;
  // The row of the world coordinates
  j;
  cells;
  // deno-lint-ignore ban-types
  characters;
  items;
  field;
  // deno-lint-ignore no-explicit-any
  #obj;
  // deno-lint-ignore no-explicit-any
  constructor(url, obj) {
    this.url = url;
    this.i = obj.i;
    this.j = obj.j;
    this.cells = obj.cells;
    this.characters = obj.characters;
    this.items = obj.items;
    this.field = obj.field;
    this.#obj = obj;
  }
  clone() {
    return new _BlockMap(this.url, structuredClone(this.#obj));
  }
  toObject() {
    return this.#obj;
  }
};
var FieldBlock = class _FieldBlock {
  #x;
  #y;
  #w;
  #h;
  // The column of the world coordinates
  #i;
  // The row of the world coordinates
  #j;
  #cellMap = {};
  #imgMap = {};
  #items;
  #characters;
  #field;
  #loadImage;
  #map;
  #canvas;
  #assetsReady = false;
  #chunks = {};
  constructor(map, loadImage2) {
    this.#i = map.i;
    this.#j = map.j;
    this.#x = this.#i * CELL_SIZE;
    this.#y = this.#j * CELL_SIZE;
    this.#h = BLOCK_SIZE * CELL_SIZE;
    this.#w = BLOCK_SIZE * CELL_SIZE;
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new FieldCell(
        cell.name,
        cell.canEnter,
        cell.color,
        cell.href ? Array.isArray(cell.href) ? cell.href : [cell.href] : void 0
      );
    }
    this.#field = map.field;
    this.#items = map.items;
    this.#characters = [];
    this.#loadImage = loadImage2;
    this.#map = map;
  }
  loadCellImage(href) {
    return this.#loadImage(
      new URL(href, this.#map.url).href
    );
  }
  clone() {
    return new _FieldBlock(this.#map.clone(), this.#loadImage);
  }
  get id() {
    return `${this.#i}.${this.#j}`;
  }
  get cells() {
    return Object.values(this.#cellMap);
  }
  get cellMap() {
    return this.#cellMap;
  }
  get canvas() {
    if (!this.#canvas) {
      this.#canvas = this.#createCanvas();
    }
    return this.#canvas;
  }
  async loadCellImages() {
    await Promise.all(
      Object.values(this.#cellMap).map(async (cell) => {
        if (cell.src) {
          for (const src of cell.src) {
            this.#imgMap[src] = await this.loadCellImage(src);
          }
        }
      })
    );
  }
  async loadAssets() {
    await void 0;
    this.#assetsReady = true;
  }
  get assetsReady() {
    return this.#assetsReady;
  }
  createImageDataForRange(i, j, gridWidth, gridHeight) {
    const canvas = new OffscreenCanvas(
      CELL_SIZE * BLOCK_SIZE,
      CELL_SIZE * BLOCK_SIZE
    );
    const layer = new CanvasWrapper(canvas);
    for (let jj = 0; jj < gridHeight; jj++) {
      for (let ii = 0; ii < gridWidth; ii++) {
        this.drawCell(layer, i + ii, j + jj);
      }
    }
    return canvas.getContext("2d").getImageData(
      CELL_SIZE * i,
      CELL_SIZE * j,
      CELL_SIZE * gridWidth,
      CELL_SIZE * gridHeight
    );
  }
  #createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = `${this.x}px`;
    canvas.style.top = `${this.y}px`;
    canvas.width = this.w;
    canvas.height = this.h;
    canvas.classList.add("crisp-edges");
    return canvas;
  }
  #createOverlay(k, l) {
    const overlay = document.createElement("div");
    overlay.style.position = "absolute";
    overlay.style.left = `${this.x + k * BLOCK_CHUNK_SIZE * CELL_SIZE}px`;
    overlay.style.top = `${this.y + l * BLOCK_CHUNK_SIZE * CELL_SIZE}px`;
    overlay.style.width = `${BLOCK_CHUNK_SIZE * CELL_SIZE}px`;
    overlay.style.height = `${BLOCK_CHUNK_SIZE * CELL_SIZE}px`;
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "1";
    overlay.style.backgroundColor = "hsla(0, 0%, 10%, 1)";
    overlay.style.transition = "background-color 1s linear";
    this.canvas.parentElement?.appendChild(overlay);
    return () => {
      overlay.style.backgroundColor = "hsla(0, 0%, 10%, 0)";
      overlay.addEventListener("transitionend", () => {
        overlay.remove();
      });
    };
  }
  drawCell(layer, i, j) {
    const cell = this.get(i, j);
    if (cell.src) {
      for (const src of cell.src) {
        layer.drawImage(this.#imgMap[src], i * CELL_SIZE, j * CELL_SIZE);
      }
    } else {
      layer.drawRect(
        i * CELL_SIZE,
        j * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        cell.color || "black"
      );
    }
    const worldI = this.#i + i;
    const worldJ = this.#j + j;
    const rng2 = (0, import_npm_seedrandom.default)(`${worldI}.${worldJ}`);
    let color;
    if (cell.canEnter()) {
      color = `hsla(${rng2() * 100 + 100}, 50%, 20%, ${rng2() * 0.1 + 0.1})`;
    } else {
      color = `hsla(240, 100%, 10%, ${rng2() * 0.2 + 0.15})`;
    }
    layer.drawRect(
      i * CELL_SIZE,
      j * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
      color
    );
  }
  renderAllChuncks() {
    const wrapper = new CanvasWrapper(this.canvas);
    for (let k = 0; k < BLOCK_SIZE / BLOCK_CHUNK_SIZE; k++) {
      for (let l = 0; l < BLOCK_SIZE / BLOCK_CHUNK_SIZE; l++) {
        this.#renderChunk(wrapper, k, l).catch((error) => {
          console.error("Failed to render chunk", k, l, error);
        });
      }
    }
  }
  renderNeighborhood(i, j) {
    const wrapper = new CanvasWrapper(this.canvas);
    const k0 = ceilN(i - this.#i - BLOCK_CHUNK_SIZE, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE;
    const l0 = ceilN(j - this.#j - BLOCK_CHUNK_SIZE, BLOCK_CHUNK_SIZE) / BLOCK_CHUNK_SIZE;
    for (let l = l0; l < l0 + 2; l++) {
      if (l < 0 || l >= BLOCK_SIZE / BLOCK_CHUNK_SIZE) {
        continue;
      }
      for (let k = k0; k < k0 + 2; k++) {
        if (k < 0 || k >= BLOCK_SIZE / BLOCK_CHUNK_SIZE) {
          continue;
        }
        this.#renderChunk(wrapper, k, l).catch((error) => {
          console.error("Failed to render chunk", k, l, error);
        });
      }
    }
  }
  async #renderChunk(layer, k, l) {
    console.log("Rendering chunk", this.id, k, l);
    const chunkKey = `${k}.${l}`;
    const chunkState = this.#chunks[chunkKey];
    if (chunkState === true || chunkState === "loading") {
      return;
    }
    const removeOverlay = this.#createOverlay(k, l);
    this.#chunks[chunkKey] = "loading";
    const render = Promise.withResolvers();
    const worker = new Worker("./canvas-worker.js");
    worker.onmessage = (event) => {
      const { imageData } = event.data;
      const offsetX = k * BLOCK_CHUNK_SIZE * CELL_SIZE;
      const offsetY = l * BLOCK_CHUNK_SIZE * CELL_SIZE;
      layer.ctx.putImageData(
        imageData,
        offsetX,
        offsetY
      );
      worker.terminate();
      render.resolve();
      this.#chunks[chunkKey] = true;
      removeOverlay();
    };
    worker.postMessage({
      url: this.#map.url,
      obj: this.toMap(),
      i: k * BLOCK_CHUNK_SIZE,
      j: l * BLOCK_CHUNK_SIZE,
      gridWidth: BLOCK_CHUNK_SIZE,
      gridHeight: BLOCK_CHUNK_SIZE
    });
    await render.promise;
    return;
  }
  get(i, j) {
    return this.#cellMap[this.#field[j][i]];
  }
  update(i, j, cell) {
    this.#field[j] = this.#field[j].substring(0, i) + cell + this.#field[j].substring(i + 1);
  }
  get i() {
    return this.#i;
  }
  get j() {
    return this.#j;
  }
  get x() {
    return this.#x;
  }
  get y() {
    return this.#y;
  }
  get h() {
    return this.#h;
  }
  get w() {
    return this.#w;
  }
  toMap() {
    return new BlockMap(this.#map.url, {
      i: this.#i,
      j: this.#j,
      cells: this.cells.map((cell) => ({
        name: cell.name,
        canEnter: cell.canEnter(),
        color: cell.color,
        href: cell.src ? cell.src.length === 1 ? cell.src[0] : cell.src : void 0
      })),
      characters: this.#characters,
      items: this.#items,
      field: this.#field
    });
  }
  /**
   * Returns the difference between this block and the other block.
   */
  diff(other) {
    const diff = [];
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const name = other.get(i, j).name;
        if (this.get(i, j).name !== name) {
          diff.push([i, j, name]);
        }
      }
    }
    return diff;
  }
};

// https://jsr.io/@kt3k/weak-value-map/0.1.2/mod.ts
var WeakValueMap = class {
  #map = /* @__PURE__ */ new Map();
  #registry = new FinalizationRegistry((key) => {
    this.#map.delete(key);
  });
  [Symbol.toStringTag] = "WeakValueMap";
  constructor(iterable = []) {
    for (const [k, v] of iterable) {
      this.set(k, v);
    }
  }
  clear() {
    for (const key of this.keys()) {
      this.delete(key);
    }
  }
  delete(key) {
    const ref = this.#map.get(key);
    if (ref) {
      this.#map.delete(key);
      this.#registry.unregister(ref);
      if (ref.deref() === void 0) {
        return false;
      }
      return true;
    }
    return false;
  }
  forEach(callbackfn, thisArg) {
    this.#map.forEach((ref, k) => {
      callbackfn(ref.deref(), k, thisArg);
    });
  }
  get(key) {
    const ref = this.#map.get(key);
    if (ref === void 0) {
      return void 0;
    }
    const value = ref.deref();
    if (value === void 0) {
      this.#map.delete(key);
      this.#registry.unregister(ref);
      return void 0;
    }
    return value;
  }
  has(key) {
    const ref = this.#map.get(key);
    if (ref === void 0) {
      return false;
    }
    const value = ref.deref();
    if (value === void 0) {
      this.#map.delete(key);
      this.#registry.unregister(ref);
      return false;
    }
    return true;
  }
  set(key, value) {
    const prevRef = this.#map.get(key);
    if (prevRef) {
      this.#registry.unregister(prevRef);
    }
    const ref = new WeakRef(value);
    this.#map.set(key, ref);
    this.#registry.register(value, key, ref);
    return this;
  }
  get size() {
    return this.#map.size;
  }
  [Symbol.iterator]() {
    return this.entries();
  }
  *entries() {
    for (const [k, ref] of this.#map.entries()) {
      const v = ref.deref();
      if (v === void 0) {
        this.#map.delete(k);
        this.#registry.unregister(ref);
        continue;
      }
      yield [k, v];
    }
  }
  *keys() {
    for (const [k, ref] of this.#map.entries()) {
      const v = ref.deref();
      if (v === void 0) {
        this.#map.delete(k);
        this.#registry.unregister(ref);
        continue;
      }
      yield k;
    }
  }
  *values() {
    for (const ref of this.#map.values()) {
      const v = ref.deref();
      if (v === void 0) {
        continue;
      }
      yield v;
    }
  }
};

// util/memo.ts
function memoizedLoading(fn) {
  const weakValueMap = new WeakValueMap();
  const weakKeyMap = /* @__PURE__ */ new WeakMap();
  return (key) => {
    const cache = weakValueMap.get(key);
    if (cache) {
      return cache;
    }
    const promise = fn(key);
    weakValueMap.set(key, promise);
    promise.then((value) => {
      weakKeyMap.set(value, promise);
    });
    return promise;
  };
}

// util/load.ts
async function loadImage_(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load image from ${path}: ${res.statusText}`);
  }
  const blob = await res.blob();
  return createImageBitmap(blob);
}
var loadImage = memoizedLoading(loadImage_);

// player/canvas-worker.ts
addEventListener("message", async (event) => {
  const start = performance.now();
  const { url, obj, i, j, gridWidth, gridHeight } = event.data;
  const blockMap = new BlockMap(url, obj);
  const fieldBlock = new FieldBlock(blockMap, loadImage);
  await fieldBlock.loadCellImages();
  const imageData = fieldBlock.createImageDataForRange(
    i,
    j,
    gridWidth,
    gridHeight
  );
  console.log("Canvas worker: Image data prepared", {
    i,
    j,
    gridWidth,
    gridHeight,
    elapsed: (performance.now() - start).toFixed(0) + "ms"
  });
  postMessage({
    imageData
  });
});
