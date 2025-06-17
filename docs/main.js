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

// https://jsr.io/@kt3k/cell/0.7.6/util.ts
var READY_STATE_CHANGE = "readystatechange";
var p;
function documentReady(doc = document) {
  p ??= new Promise((resolve) => {
    const checkReady = () => {
      if (doc.readyState === "complete") {
        resolve();
        doc.removeEventListener(READY_STATE_CHANGE, checkReady);
      }
    };
    doc.addEventListener(READY_STATE_CHANGE, checkReady);
    checkReady();
  });
  return p;
}
var boldColor = (color) => `color: ${color}; font-weight: bold;`;
var defaultEventColor = "#f012be";
function logEvent({
  component,
  e,
  module,
  color
}) {
  if (typeof __DEV__ === "boolean" && !__DEV__)
    return;
  const event = e.type;
  if (typeof DEBUG_IGNORE === "object" && DEBUG_IGNORE?.has(event))
    return;
  console.groupCollapsed(
    `${module}> %c${event}%c on %c${component}`,
    boldColor(color || defaultEventColor),
    "",
    boldColor("#1a80cc")
  );
  console.log(e);
  if (e.target) {
    console.log(e.target);
  }
  console.groupEnd();
}

// https://jsr.io/@kt3k/signal/0.3.0/mod.ts
var Signal = class _Signal {
  #val;
  #handlers = [];
  constructor(value) {
    this.#val = value;
  }
  /**
   * Get the current value of the signal.
   *
   * @returns The current value of the signal
   */
  get() {
    return this.#val;
  }
  /**
   * Update the signal value.
   *
   * @param value The new value of the signal
   */
  update(value) {
    if (this.#val !== value) {
      this.#val = value;
      this.#handlers.forEach((handler) => {
        handler(value);
      });
    }
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated
   * @returns A function to stop the subscription
   */
  onChange(cb) {
    this.#handlers.push(cb);
    return () => {
      this.#handlers.splice(this.#handlers.indexOf(cb) >>> 0, 1);
    };
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated and also called immediately
   * @returns A function to stop the subscription
   */
  subscribe(cb) {
    cb(this.#val);
    return this.onChange(cb);
  }
  /** Maps the signal to a different signal */
  map(fn) {
    const signal = new _Signal(fn(this.#val));
    this.onChange((val) => signal.update(fn(val)));
    return signal;
  }
};
var GroupSignal = class _GroupSignal {
  #val;
  #handlers = [];
  constructor(value) {
    this.#val = value;
  }
  /**
   * Get the current value of the signal.
   *
   * @returns The current value of the signal
   */
  get() {
    return this.#val;
  }
  /**
   * Update the signal value.
   * The signal event is only emitted when the fields of the new value are different from the current value.
   *
   * @param value The new value of the signal
   */
  update(value) {
    if (typeof value !== "object" || value === null) {
      throw new Error("value must be an object");
    }
    for (const key of Object.keys(value)) {
      if (this.#val[key] !== value[key]) {
        this.#val = { ...value };
        this.#handlers.forEach((handler) => {
          handler(this.#val);
        });
        break;
      }
    }
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated
   * @returns A function to stop the subscription
   */
  onChange(cb) {
    this.#handlers.push(cb);
    return () => {
      this.#handlers.splice(this.#handlers.indexOf(cb) >>> 0, 1);
    };
  }
  /**
   * Subscribe to the signal.
   *
   * @param cb The callback function to be called when the signal is updated and also called immediately
   * @returns A function to stop the subscription
   */
  subscribe(cb) {
    cb(this.#val);
    return this.onChange(cb);
  }
  /** Maps the signal to a different signal */
  map(fn) {
    const signal = new _GroupSignal(fn(this.#val));
    this.onChange((val) => signal.update(fn(val)));
    return signal;
  }
};

// https://jsr.io/@kt3k/cell/0.7.6/mod.ts
var registry = {};
function assert(assertion, message) {
  if (!assertion) {
    throw new Error(message);
  }
}
function assertComponentNameIsValid(name) {
  assert(typeof name === "string", "The name should be a string");
  assert(
    !!registry[name],
    `The component of the given name is not registered: ${name}`
  );
}
function register(component, name) {
  assert(
    typeof name === "string" && !!name,
    "Component name must be a non-empty string"
  );
  assert(
    !registry[name],
    `The component of the given name is already registered: ${name}`
  );
  const initClass = `${name}-\u{1F48A}`;
  const initializer = (el) => {
    if (!el.classList.contains(initClass)) {
      const onUnmount = (handler) => {
        el.addEventListener(`__unmount__:${name}`, handler, { once: true });
      };
      el.classList.add(name);
      el.classList.add(initClass);
      onUnmount(() => el.classList.remove(initClass));
      const on = (type, selector, options, handler) => {
        if (typeof selector === "function") {
          handler = selector;
          selector = void 0;
          options = void 0;
        } else if (typeof options === "function" && typeof selector === "string") {
          handler = options;
          options = void 0;
        } else if (typeof options === "function" && typeof selector === "object") {
          handler = options;
          options = selector;
          selector = void 0;
        }
        if (typeof handler !== "function") {
          throw new Error(
            `Cannot add event listener: The handler must be a function, but ${typeof handler} is given`
          );
        }
        addEventListener(name, el, type, handler, selector, options);
      };
      const onOutside = (type, handler) => {
        assertEventType(type);
        assertEventHandler(handler);
        const listener = (e) => {
          if (el !== e.target && !el.contains(e.target)) {
            logEvent({
              module: "outside",
              color: "#39cccc",
              e,
              component: name
            });
            handler(e);
          }
        };
        document.addEventListener(type, listener);
        onUnmount(() => document.removeEventListener(type, listener));
      };
      const subscribe = (signal, handler) => {
        onUnmount(signal.subscribe(handler));
      };
      const context = {
        el,
        on,
        onOutside,
        onUnmount,
        query: (s) => el.querySelector(s),
        queryAll: (s) => el.querySelectorAll(s),
        subscribe
      };
      const html = component(context);
      if (typeof html === "string") {
        el.innerHTML = html;
      } else if (html && typeof html.then === "function") {
        html.then((html2) => {
          if (typeof html2 === "string") {
            el.innerHTML = html2;
          }
        });
      }
    }
  };
  initializer.sel = `.${name}:not(.${initClass})`;
  registry[name] = initializer;
  if (!globalThis.document)
    return;
  if (document.readyState === "complete") {
    mount();
  } else {
    documentReady().then(() => {
      mount(name);
    });
  }
}
function assertEventHandler(handler) {
  assert(
    typeof handler === "function",
    `Cannot add an event listener: The event handler must be a function, ${typeof handler} (${handler}) is given`
  );
}
function assertEventType(type) {
  assert(
    typeof type === "string",
    `Cannot add an event listener: The event type must be a string, ${typeof type} (${type}) is given`
  );
}
function addEventListener(name, el, type, handler, selector, options) {
  assertEventType(type);
  assertEventHandler(handler);
  const listener = (e) => {
    if (!selector || [].some.call(
      el.querySelectorAll(selector),
      (node) => node === e.target || node.contains(e.target)
    )) {
      logEvent({
        module: "\u{1F48A}",
        color: "#e0407b",
        e,
        component: name
      });
      handler(e);
    }
  };
  el.addEventListener(`__unmount__:${name}`, () => {
    el.removeEventListener(type, listener, options);
  }, { once: true });
  el.addEventListener(type, listener, options);
}
function mount(name, el) {
  let classNames;
  if (!name) {
    classNames = Object.keys(registry);
  } else {
    assertComponentNameIsValid(name);
    classNames = [name];
  }
  classNames.map((className) => {
    ;
    [].map.call(
      (el || document).querySelectorAll(registry[className].sel),
      registry[className]
    );
  });
}

// https://jsr.io/@kt3k/gameloop/1.5.0/mod.ts
var GameloopImpl = class {
  #main;
  #timer;
  #frame;
  #resolve;
  #onStep;
  #fps;
  constructor(main, fps) {
    this.#main = main;
    this.#fps = fps;
    this.#frame = 1e3 / fps;
  }
  /** Starts the game loop. */
  run() {
    if (this.#resolve) {
      return Promise.reject(new Error("The gameloop is already running."));
    }
    return new Promise((resolve, _) => {
      this.#resolve = resolve;
      this.#step();
    });
  }
  /** Returns true iff the loop is running. */
  get isRunning() {
    return this.#resolve != null;
  }
  /** Performs the step routine. */
  #step = () => {
    const startedAt = Date.now();
    this.#main();
    const endedAt = Date.now();
    const duration = endedAt - startedAt;
    const wait = this.#frame - duration;
    const fps = Math.min(1e3 / duration, this.#fps);
    if (this.#onStep) {
      this.#onStep(fps);
    }
    this.#timer = setTimeout(this.#step, wait);
  };
  /** Stops the game loop. */
  stop() {
    if (!this.#resolve) {
      throw new Error("The gameloop isn't running.");
    }
    this.#resolve();
    this.#resolve = void 0;
    clearTimeout(this.#timer);
  }
  onStep(callback) {
    this.#onStep = callback;
  }
};
function gameloop(main, fps) {
  return new GameloopImpl(main, fps);
}

// util/dir.ts
var UP = "up";
var DOWN = "down";
var LEFT = "left";
var RIGHT = "right";
var DIRS = [
  UP,
  DOWN,
  LEFT,
  RIGHT
];
var Input = {
  up: false,
  down: false,
  left: false,
  right: false
};
function clearInput() {
  for (const dir of DIRS) {
    Input[dir] = false;
  }
}

// player/ui/key-monitor.ts
var KEY_UP = /* @__PURE__ */ new Set(["ArrowUp", "w", "k"]);
var KEY_DOWN = /* @__PURE__ */ new Set(["ArrowDown", "s", "j"]);
var KEY_LEFT = /* @__PURE__ */ new Set(["ArrowLeft", "a", "h"]);
var KEY_RIGHT = /* @__PURE__ */ new Set(["ArrowRight", "d", "l"]);
function KeyMonitor({ on }) {
  on("keydown", (e) => {
    if (KEY_UP.has(e.key)) {
      Input.up = true;
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = true;
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = true;
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = true;
    }
  });
  on("keyup", (e) => {
    if (KEY_UP.has(e.key)) {
      Input.up = false;
    } else if (KEY_DOWN.has(e.key)) {
      Input.down = false;
    } else if (KEY_LEFT.has(e.key)) {
      Input.left = false;
    } else if (KEY_RIGHT.has(e.key)) {
      Input.right = false;
    }
  });
}

// util/constants.ts
var CELL_SIZE = 16;
var BLOCK_SIZE = 200;

// util/signal.ts
var fpsSignal = new Signal(0);
var viewScopeSignal = new GroupSignal({ x: 0, y: 0 });
var isLoadingSignal = new Signal(true);
var centerPixelSignal = new GroupSignal({ x: 0, y: 0 });
var centerGridSignal = centerPixelSignal.map(({ x, y }) => ({
  i: Math.floor(x / CELL_SIZE),
  j: Math.floor(y / CELL_SIZE)
}));
var centerGrid10Signal = centerGridSignal.map(({ i, j }) => ({
  i: Math.floor(i / 10) * 10,
  j: Math.floor(j / 10) * 10
}));

// player/ui/fps-monitor.ts
function FpsMonitor({ el }) {
  fpsSignal.subscribe((fps) => {
    el.textContent = fps.toFixed(2);
  });
}

// util/touch.ts
function getDistance(current, prev) {
  const x = current.screenX - prev.screenX;
  const y = current.screenY - prev.screenY;
  return Math.sqrt(x ** 2 + y ** 2);
}
function getDir(current, prev) {
  const x = current.screenX - prev.screenX;
  const y = current.screenY - prev.screenY;
  const theta = Math.atan2(y, x);
  if (Math.PI / 4 <= theta && theta < 3 * Math.PI / 4) {
    return DOWN;
  } else if (-Math.PI / 4 <= theta && theta < Math.PI / 4) {
    return RIGHT;
  } else if (-3 * Math.PI / 4 <= theta && theta < -Math.PI / 4) {
    return UP;
  } else {
    return LEFT;
  }
}

// player/ui/swipe-handler.ts
var TOUCH_SENSITIVITY_THRESHOLD = 25;
function SwipeHandler({ on }) {
  let prevTouch;
  on("touchstart", (e) => {
    prevTouch = e.touches[0];
  });
  on("touchmove", { passive: false }, (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    if (prevTouch) {
      const dist = getDistance(touch, prevTouch);
      if (dist < TOUCH_SENSITIVITY_THRESHOLD) {
        return;
      }
      clearInput();
      const dir = getDir(touch, prevTouch);
      Input[dir] = true;
    }
    prevTouch = touch;
  });
  on("touchend", () => {
    clearInput();
  });
}

// player/ui/loading-indicator.ts
function LoadingIndicator({ el }) {
  isLoadingSignal.subscribe((v) => el.classList.toggle("hidden", !v));
}

// util/canvas-layer.ts
var CanvasLayer = class {
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

// util/math.ts
function floorN(x, n) {
  return Math.floor(x / n) * n;
}
function ceilN(x, n) {
  return Math.ceil(x / n) * n;
}
function modulo(x, m) {
  const r = x % m;
  return r >= 0 ? r : r + m;
}

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
function loadImage_(path) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve(img);
    };
    img.onerror = (e) => {
      reject(e);
    };
    img.src = path;
  });
}
var loadImage = memoizedLoading(loadImage_);

// util/random.ts
var import_npm_seedrandom = __toESM(require_seedrandom2());
var rng = (0, import_npm_seedrandom.default)("Hello.");

// player/models.ts
var Character = class {
  /** The current direction of the character */
  #dir = "down";
  /** The column of the world coordinates */
  #i;
  /** The row of the world coordinates */
  #j;
  /** The distance of the current movement */
  #d = 0;
  /** The speed of the move */
  #speed = 1;
  /** True when moving, false otherwise */
  #isMoving = false;
  /** The phase of the move */
  #movePhase = 0;
  /** Type of the move */
  #moveType = "linear";
  /** The prefix of assets */
  #assetPrefix;
  /** The images necessary to render this character */
  #assets;
  constructor(i, j, speed, assetPrefix) {
    this.#i = i;
    this.#j = j;
    this.#speed = speed;
    this.#assetPrefix = assetPrefix;
  }
  setState(state) {
    this.#dir = state;
  }
  #readInput(input) {
    if (input.up) {
      this.setState(UP);
    } else if (input.down) {
      this.setState(DOWN);
    } else if (input.left) {
      this.setState(LEFT);
    } else if (input.right) {
      this.setState(RIGHT);
    }
  }
  /** Returns the grid coordinates of the 1 cell front of the character. */
  front() {
    if (this.#dir === UP) {
      return [this.#i, this.#j - 1];
    } else if (this.#dir === DOWN) {
      return [this.#i, this.#j + 1];
    } else if (this.#dir === LEFT) {
      return [this.#i - 1, this.#j];
    } else {
      return [this.#i + 1, this.#j];
    }
  }
  step(input, terrain) {
    if (this.#movePhase === 0 && (input.up || input.down || input.left || input.right)) {
      this.#isMoving = true;
      this.#readInput(input);
      const [i, j] = this.front();
      const cell = terrain.get(i, j);
      if (cell.canEnter()) {
        this.#moveType = "linear";
      } else {
        this.#moveType = "bounce";
      }
    }
    if (this.#isMoving) {
      if (this.#moveType === "linear") {
        this.#movePhase += this.#speed;
        this.#d += this.#speed;
        if (this.#movePhase == 16) {
          this.#movePhase = 0;
          this.#isMoving = false;
          this.#d = 0;
          if (this.#dir === UP) {
            this.#j -= 1;
          } else if (this.#dir === DOWN) {
            this.#j += 1;
          } else if (this.#dir === LEFT) {
            this.#i -= 1;
          } else if (this.#dir === RIGHT) {
            this.#i += 1;
          }
        }
      } else if (this.#moveType === "bounce") {
        this.#movePhase += this.#speed;
        if (this.#movePhase < 8) {
          this.#d += this.#speed / 2;
        } else {
          this.#d -= this.#speed / 2;
        }
        if (this.#movePhase == 16) {
          this.#movePhase = 0;
          this.#isMoving = false;
          this.#d = 0;
        }
      }
    }
  }
  image() {
    if (this.#movePhase >= 8) {
      return this.#assets[`${this.#dir}1`];
    } else {
      return this.#assets[`${this.#dir}0`];
    }
  }
  /** Gets the x of the world coordinates */
  get x() {
    if (this.#dir === LEFT) {
      return this.#i * CELL_SIZE - this.#d;
    } else if (this.#dir === RIGHT) {
      return this.#i * CELL_SIZE + this.#d;
    } else {
      return this.#i * CELL_SIZE;
    }
  }
  get centerX() {
    return this.x + CELL_SIZE / 2;
  }
  /** Gets the y of the world coordinates */
  get y() {
    if (this.#dir === UP) {
      return this.#j * CELL_SIZE - this.#d;
    } else if (this.#dir === DOWN) {
      return this.#j * CELL_SIZE + this.#d;
    } else {
      return this.#j * CELL_SIZE;
    }
  }
  get h() {
    return CELL_SIZE;
  }
  get w() {
    return CELL_SIZE;
  }
  get centerY() {
    return this.y + CELL_SIZE / 2;
  }
  /**
   * Loads the assets and store resulted HTMLImageElement in the fields.
   * Assets are managed like this way to make garbage collection easier.
   */
  async loadAssets() {
    const [up0, up1, down0, down1, left0, left1, right0, right1] = await Promise.all([
      `${this.#assetPrefix}up0.png`,
      `${this.#assetPrefix}up1.png`,
      `${this.#assetPrefix}down0.png`,
      `${this.#assetPrefix}down1.png`,
      `${this.#assetPrefix}left0.png`,
      `${this.#assetPrefix}left1.png`,
      `${this.#assetPrefix}right0.png`,
      `${this.#assetPrefix}right1.png`
    ].map(loadImage));
    this.#assets = {
      up0,
      up1,
      down0,
      down1,
      left0,
      left1,
      right0,
      right1
    };
  }
  get assetsReady() {
    return !!this.#assets;
  }
};
var TerrainBlockCell = class {
  #color;
  #href;
  #canEnter;
  #name;
  constructor(name, canEnter, color, href) {
    this.#name = name;
    this.#canEnter = canEnter;
    this.#color = color;
    this.#href = href;
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
  get href() {
    return this.#href;
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
  characters;
  items;
  terrain;
  #obj;
  // deno-lint-ignore no-explicit-any
  constructor(url, obj) {
    this.url = url;
    this.i = obj.i;
    this.j = obj.j;
    this.cells = obj.cells;
    this.characters = obj.characters;
    this.items = obj.items;
    this.terrain = obj.terrain;
    this.#obj = obj;
  }
  clone() {
    return new _BlockMap(this.url, structuredClone(this.#obj));
  }
  toObject() {
    return this.#obj;
  }
};
var TerrainBlock = class _TerrainBlock {
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
  #terrain;
  #loadImage;
  #map;
  constructor(map, loadImage2) {
    this.#i = map.i;
    this.#j = map.j;
    this.#x = this.#i * CELL_SIZE;
    this.#y = this.#j * CELL_SIZE;
    this.#h = BLOCK_SIZE * CELL_SIZE;
    this.#w = BLOCK_SIZE * CELL_SIZE;
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new TerrainBlockCell(
        cell.name,
        cell.canEnter,
        cell.color,
        cell.href
      );
    }
    this.#terrain = map.terrain;
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
    return new _TerrainBlock(this.#map.clone(), this.#loadImage);
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
  async loadAssets() {
    await Promise.all(
      Object.values(this.#cellMap).map(async (cell) => {
        if (cell.href) {
          this.#imgMap[cell.href] = await this.loadCellImage(cell.href);
        }
      })
    );
  }
  createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = `${this.x}px`;
    canvas.style.top = `${this.y}px`;
    canvas.width = this.w;
    canvas.height = this.h;
    canvas.classList.add("crisp-edges");
    this.#renderBlock(new CanvasLayer(canvas));
    return canvas;
  }
  drawCell(layer, i, j) {
    const cell = this.get(i, j);
    if (cell.href) {
      layer.drawImage(this.#imgMap[cell.href], i * CELL_SIZE, j * CELL_SIZE);
    } else {
      layer.drawRect(
        i * CELL_SIZE,
        j * CELL_SIZE,
        CELL_SIZE,
        CELL_SIZE,
        cell.color || "black"
      );
    }
    if (!cell.canEnter()) {
      return;
    }
    const worldI = this.#i + i;
    const worldJ = this.#j + j;
    const rng2 = (0, import_npm_seedrandom.default)(`${worldI}.${worldJ}`);
    const choice = (arr) => arr[Math.floor(rng2() * arr.length)];
    const color = `hsla(90, 100%, 50%, ${choice([0.1, 0.2])})`;
    layer.drawRect(
      i * CELL_SIZE,
      j * CELL_SIZE,
      CELL_SIZE,
      CELL_SIZE,
      color
    );
  }
  #renderBlock(layer) {
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        this.drawCell(layer, i, j);
      }
    }
  }
  get(i, j) {
    return this.#cellMap[this.#terrain[j][i]];
  }
  update(i, j, cell) {
    this.#terrain[j] = this.#terrain[j].substring(0, i) + cell + this.#terrain[j].substring(i + 1);
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
        href: cell.href
      })),
      characters: this.#characters,
      items: this.#items,
      terrain: this.#terrain
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

// player/main.ts
var RectScope = class {
  #w;
  #h;
  #left = 0;
  #top = 0;
  #bottom = 0;
  #right = 0;
  constructor(w, h) {
    this.#w = w;
    this.#h = h;
    this.setCenter(0, 0);
  }
  setCenter(x, y) {
    this.#left = x - this.#w / 2;
    this.#top = y - this.#h / 2;
    this.#right = x + this.#w / 2;
    this.#bottom = y + this.#h / 2;
  }
  get left() {
    return this.#left;
  }
  get top() {
    return this.#top;
  }
  get right() {
    return this.#right;
  }
  get bottom() {
    return this.#bottom;
  }
  /** The given IBox overlaps with this rectangle scope. */
  overlaps(char) {
    const { x, y, w, h } = char;
    return this.left <= x + w && this.right >= x && this.top <= y + h && this.bottom >= y;
  }
};
var ViewScope = class extends RectScope {
  setCenter(x, y) {
    super.setCenter(x, y);
    viewScopeSignal.update({ x: -this.left, y: -this.top });
  }
};
var Walkers = class {
  #walkers = [];
  constructor(chars = []) {
    this.#walkers = chars;
  }
  add(walker) {
    this.#walkers.push(walker);
  }
  step(input, terrain) {
    for (const walker of this.#walkers) {
      walker.step(input, terrain);
    }
  }
  get assetsReady() {
    return this.#walkers.every((x) => x.assetsReady);
  }
  [Symbol.iterator]() {
    return this.#walkers[Symbol.iterator]();
  }
};
var WalkScope = class extends RectScope {
};
var LoadScope = class _LoadScope extends RectScope {
  static LOAD_UNIT = 200 * CELL_SIZE;
  constructor() {
    super(_LoadScope.LOAD_UNIT, _LoadScope.LOAD_UNIT);
  }
  blockIds() {
    const { LOAD_UNIT } = _LoadScope;
    const left = floorN(this.left, _LoadScope.LOAD_UNIT);
    const right = ceilN(this.right, _LoadScope.LOAD_UNIT);
    const top = floorN(this.top, _LoadScope.LOAD_UNIT);
    const bottom = ceilN(this.bottom, _LoadScope.LOAD_UNIT);
    const list = [];
    for (let x = left; x < right; x += LOAD_UNIT) {
      for (let y = top; y < bottom; y += LOAD_UNIT) {
        const i = x / CELL_SIZE;
        const j = y / CELL_SIZE;
        list.push(`${i}.${j}`);
      }
    }
    return list;
  }
};
var BlockMapLoader = class {
  #loading = /* @__PURE__ */ new Set();
  #root;
  constructor(root) {
    this.#root = root;
  }
  loadMaps(mapIds) {
    const maps = mapIds.map(
      (mapId) => new URL(`block_${mapId}.json`, this.#root).href
    );
    return Promise.all(maps.map((map) => this.loadMap(map)));
  }
  async loadMap(url) {
    this.#loading.add(url);
    const resp = await fetch(url);
    const map = new BlockMap(url, await resp.json());
    this.#loading.delete(url);
    return map;
  }
  get isLoading() {
    return this.#loading.size > 0;
  }
};
var UnloadScope = class _UnloadScope extends RectScope {
  static UNLOAD_UNIT = 200 * CELL_SIZE;
  constructor() {
    super(_UnloadScope.UNLOAD_UNIT, _UnloadScope.UNLOAD_UNIT);
  }
};
var Terrain = class {
  #el;
  #blocks = {};
  #blockElements = {};
  #loadScope = new LoadScope();
  #unloadScope = new UnloadScope();
  #mapLoader = new BlockMapLoader(new URL("map/", location.href).href);
  constructor(el) {
    this.#el = el;
  }
  async addDistrict(block) {
    this.#blocks[block.id] = block;
    await block.loadAssets();
    const canvas = block.createCanvas();
    this.#blockElements[block.id] = canvas;
    this.#el.appendChild(canvas);
  }
  removeBlock(block) {
    delete this.#blocks[block.id];
    this.#el.removeChild(this.#blockElements[block.id]);
    delete this.#blockElements[block.id];
  }
  get(i, j) {
    const k = floorN(i, BLOCK_SIZE);
    const l = floorN(j, BLOCK_SIZE);
    return this.#blocks[`${k}.${l}`].get(
      modulo(i, BLOCK_SIZE),
      modulo(j, BLOCK_SIZE)
    );
  }
  hasBlock(blockId) {
    return !!this.#blocks[blockId];
  }
  [Symbol.iterator]() {
    return Object.values(this.#blocks)[Symbol.iterator]();
  }
  translateElement(x, y) {
    this.#el.style.transform = `translateX(${x}px) translateY(${y}px)`;
  }
  async checkLoad(i, j) {
    this.#loadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE);
    const blockIdsToLoad = this.#loadScope.blockIds().filter(
      (id) => !this.hasBlock(id)
    );
    for (const map of await this.#mapLoader.loadMaps(blockIdsToLoad)) {
      this.addDistrict(new TerrainBlock(map, loadImage));
    }
  }
  checkUnload(i, j) {
    this.#unloadScope.setCenter(i * CELL_SIZE, j * CELL_SIZE);
    for (const block of this) {
      if (!this.#unloadScope.overlaps(block)) {
        this.removeBlock(block);
      }
    }
  }
  get assetsReady() {
    return !this.#mapLoader.isLoading;
  }
};
function GameScreen({ query }) {
  const layer = new CanvasLayer(query(".canvas1"));
  const me = new Character(2, 2, 1, "char/joob/");
  centerPixelSignal.update({ x: me.centerX, y: me.centerY });
  const viewScope = new ViewScope(layer.width, layer.height);
  centerPixelSignal.subscribe(({ x, y }) => viewScope.setCenter(x, y));
  const walkers = new Walkers([me]);
  const walkScope = new WalkScope(layer.width * 3, layer.height * 3);
  centerGridSignal.subscribe(
    ({ i, j }) => walkScope.setCenter(i * CELL_SIZE, j * CELL_SIZE)
  );
  const terrain = new Terrain(query(".terrain"));
  centerGrid10Signal.subscribe(({ i, j }) => terrain.checkLoad(i, j));
  centerGrid10Signal.subscribe(({ i, j }) => terrain.checkUnload(i, j));
  viewScopeSignal.subscribe(({ x, y }) => terrain.translateElement(x, y));
  me.loadAssets();
  isLoadingSignal.subscribe((v) => {
    if (!v) {
      query(".curtain").style.opacity = "0";
    }
  });
  const loop = gameloop(() => {
    if (!walkers.assetsReady || !terrain.assetsReady) {
      isLoadingSignal.update(true);
      return;
    }
    isLoadingSignal.update(false);
    walkers.step(Input, terrain);
    centerPixelSignal.update({
      x: me.centerX,
      y: me.centerY
    });
    layer.clear();
    for (const walker of walkers) {
      if (!viewScope.overlaps(walker)) {
        continue;
      }
      layer.drawImage(
        walker.image(),
        walker.x - viewScope.left,
        walker.y - viewScope.top
      );
    }
  }, 60);
  loop.onStep((fps) => fpsSignal.update(fps));
  loop.run();
}
globalThis.addEventListener("blur", clearInput);
register(GameScreen, "js-game-screen");
register(FpsMonitor, "js-fps-monitor");
register(KeyMonitor, "js-key-monitor");
register(SwipeHandler, "js-swipe-handler");
register(LoadingIndicator, "js-loading-indicator");
/*! Cell v0.7.6 | Copyright 2022-2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
