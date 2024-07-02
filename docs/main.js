// https://jsr.io/@kt3k/cell/0.1.6/util.ts
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

// https://jsr.io/@kt3k/cell/0.1.6/mod.ts
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
      el.classList.add(name);
      el.classList.add(initClass);
      el.addEventListener(`__unmount__:${name}`, () => {
        el.classList.remove(initClass);
      }, { once: true });
      const on = new Proxy(() => {
      }, {
        // simple event handler (like on.click = (e) => {})
        set(_, type, value) {
          addEventListener(name, el, type, value);
          return true;
        },
        get(_, outside) {
          if (outside === "outside") {
            return new Proxy({}, {
              set(_2, type, value) {
                assert(
                  typeof value === "function",
                  `Event handler must be a function, ${typeof value} (${value}) is given`
                );
                const listener = (e) => {
                  if (el !== e.target && !el.contains(e.target)) {
                    logEvent({
                      module: "outside",
                      color: "#39cccc",
                      e,
                      component: name
                    });
                    value(e);
                  }
                };
                document.addEventListener(type, listener);
                el.addEventListener(`__unmount__:${name}`, () => {
                  document.removeEventListener(type, listener);
                }, { once: true });
                return true;
              }
            });
          }
          return null;
        },
        // event delegation handler (like on(".button").click = (e) => {}))
        apply(_target, _thisArg, args) {
          const selector = args[0];
          assert(
            typeof selector === "string",
            "Delegation selector must be a string. ${typeof selector} is given."
          );
          return new Proxy({}, {
            set(_, type, value) {
              addEventListener(
                name,
                el,
                type,
                // deno-lint-ignore no-explicit-any
                value,
                selector
              );
              return true;
            }
          });
        }
      });
      const pub = (type, data) => {
        document.querySelectorAll(`.sub\\:${type}`).forEach((el2) => {
          el2.dispatchEvent(
            new CustomEvent(type, { bubbles: false, detail: data })
          );
        });
      };
      const sub = (type) => el.classList.add(`sub:${type}`);
      const context = {
        el,
        on,
        pub,
        sub,
        query: (s) => el.querySelector(s),
        queryAll: (s) => el.querySelectorAll(s)
      };
      const html = component(context);
      if (typeof html === "string") {
        el.innerHTML = html;
      }
    }
  };
  initializer.sel = `.${name}:not(.${initClass})`;
  registry[name] = initializer;
  if (document.readyState === "complete") {
    mount();
  } else {
    documentReady().then(() => {
      mount(name);
    });
  }
}
function addEventListener(name, el, type, handler, selector) {
  assert(
    typeof handler === "function",
    `Event handler must be a function, ${typeof handler} (${handler}) is given`
  );
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
    el.removeEventListener(type, listener);
  }, { once: true });
  el.addEventListener(type, listener);
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

// src/main.ts
function loadImage(path) {
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
function loadImages(paths) {
  return Promise.all(paths.map(loadImage));
}
var Brush = class {
  constructor(ctx) {
    this.ctx = ctx;
  }
  drawImage(img, x, y, w, h) {
    this.ctx.clearRect(x, y, w, h);
    this.ctx.drawImage(img, x, y);
  }
};
function Canvas1({ el, pub }) {
  const WIDTH = el.width;
  const HEIGHT = el.height;
  const W = Math.floor(WIDTH / 16);
  const H = Math.floor(HEIGHT / 16);
  const canvasCtx = el.getContext("2d");
  const brush = new Brush(canvasCtx);
  loadImages([
    "./char/juni/juni_b0.png",
    "./char/juni/juni_b1.png",
    "./char/juni/juni_f0.png",
    "./char/juni/juni_f1.png",
    "./char/juni/juni_l0.png",
    "./char/juni/juni_l1.png",
    "./char/juni/juni_r0.png",
    "./char/juni/juni_r1.png"
  ]).then((images) => {
    const loop = gameloop(() => {
      const i = Math.floor(Math.random() * W);
      const j = Math.floor(Math.random() * H);
      brush.drawImage(
        images[Math.floor(Math.random() * 8)],
        i * 16,
        j * 16,
        16,
        16
      );
    }, 60);
    loop.onStep((fps) => pub("fps", fps));
    loop.run();
  });
}
function Canvas2({ el }) {
  const WIDTH = +el.width;
  const HEIGHT = +el.height;
  const canvasCtx = el.getContext("2d");
  canvasCtx.fillStyle = "black";
  canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
}
function FPSMonitor({ sub, on, el }) {
  sub("fps");
  on.fps = (e) => {
    el.textContent = e.detail.toFixed(2);
  };
  return "0";
}
register(Canvas1, "canvas1");
register(Canvas2, "canvas2");
register(FPSMonitor, "js-fps-monitor");
/*! Cell v0.1.6 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
