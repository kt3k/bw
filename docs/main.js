// https://jsr.io/@kt3k/cell/0.5.0/util.ts
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

// https://jsr.io/@kt3k/cell/0.5.0/mod.ts
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
        el.addEventListener(`__unmount__:${name}`, () => {
          document.removeEventListener(type, listener);
        }, { once: true });
      };
      const context = {
        el,
        on,
        onOutside,
        query: (s) => el.querySelector(s),
        queryAll: (s) => el.querySelectorAll(s)
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

// src/util/load.ts
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

// src/util/dir.ts
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

// src/ui/key-monitor.ts
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

// src/util/constants.ts
var CELL_SIZE = 16;
var BLOCK_SIZE = 200;

// src/util/signal.ts
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

// src/ui/fps-monitor.ts
function FpsMonitor({ el }) {
  fpsSignal.subscribe((fps) => {
    el.textContent = fps.toFixed(2);
  });
}

// src/util/touch.ts
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

// src/ui/swipe-handler.ts
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

// src/ui/loading-indicator.ts
function LoadingIndicator({ el }) {
  isLoadingSignal.subscribe((v) => el.classList.toggle("hidden", !v));
}

// src/util/canvas-layer.ts
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
  get width() {
    return this.#ctx.canvas.width;
  }
  get height() {
    return this.#ctx.canvas.height;
  }
};

// src/util/math.ts
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

// src/main.ts
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
      return this.#assets[`${this.#dir}0`];
    } else {
      return this.#assets[`${this.#dir}1`];
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
  #prefix;
  constructor(prefix) {
    this.#prefix = prefix;
  }
  loadMaps(mapIds) {
    const maps = mapIds.map((mapId) => `${this.#prefix}${mapId}.json`);
    return Promise.all(maps.map((map) => this.loadMap(map)));
  }
  async loadMap(url) {
    this.#loading.add(url);
    const resp = await fetch(url);
    const map = new BlockMap(await resp.json());
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
var BlockMap = class {
  // The column of the world coordinates
  i;
  // The row of the world coordinates
  j;
  cells;
  characters;
  items;
  terrain;
  // deno-lint-ignore no-explicit-any
  constructor(obj) {
    this.i = obj.i;
    this.j = obj.j;
    this.cells = obj.cells;
    this.characters = obj.characters;
    this.items = obj.items;
    this.terrain = obj.terrain;
  }
};
var TerrainBlockCell = class {
  #color;
  #href;
  #canEnter;
  #img;
  constructor(canEnter, color, href) {
    this.#canEnter = canEnter;
    this.#color = color;
    this.#href = href;
  }
  canEnter() {
    return this.#canEnter;
  }
  async loadAssets() {
    if (this.#href) {
      this.#img = await loadImage(this.#href);
    }
  }
  get color() {
    return this.#color;
  }
  get img() {
    return this.#img;
  }
};
var TerrainBlock = class {
  #x;
  #y;
  #w;
  #h;
  // The column of the world coordinates
  #i;
  // The row of the world coordinates
  #j;
  #cellMap = {};
  #items;
  #characters;
  #terrain;
  constructor(map) {
    this.#i = map.i;
    this.#j = map.j;
    this.#x = this.#i * CELL_SIZE;
    this.#y = this.#j * CELL_SIZE;
    this.#h = BLOCK_SIZE * CELL_SIZE;
    this.#w = BLOCK_SIZE * CELL_SIZE;
    for (const cell of map.cells) {
      this.#cellMap[cell.name] = new TerrainBlockCell(
        cell.canEnter,
        cell.color,
        cell.href
      );
    }
    this.#terrain = map.terrain;
    this.#items = map.items;
    this.#characters = [];
  }
  get id() {
    return `${this.#i}.${this.#j}`;
  }
  async createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.left = `${this.x}px`;
    canvas.style.top = `${this.y}px`;
    canvas.width = this.w;
    canvas.height = this.h;
    canvas.classList.add("crisp-edges");
    await Promise.all(
      Object.values(this.#cellMap).map((cell) => cell.loadAssets())
    );
    this.#renderBlock(new CanvasLayer(canvas));
    return canvas;
  }
  #renderBlock(layer) {
    for (let j = 0; j < BLOCK_SIZE; j++) {
      for (let i = 0; i < BLOCK_SIZE; i++) {
        const cell = this.get(i, j);
        if (cell.img) {
          layer.drawImage(cell.img, i * CELL_SIZE, j * CELL_SIZE);
        } else {
          layer.drawRect(
            i * CELL_SIZE,
            j * CELL_SIZE,
            CELL_SIZE,
            CELL_SIZE,
            cell.color || "black"
          );
        }
      }
    }
  }
  get(i, j) {
    return this.#cellMap[this.#terrain[j][i]];
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
};
var Terrain = class {
  #el;
  #blocks = {};
  #blockElements = {};
  #loadScope = new LoadScope();
  #unloadScope = new UnloadScope();
  #mapLoader = new BlockMapLoader("map/block_");
  constructor(el) {
    this.#el = el;
  }
  async addDistrict(block) {
    this.#blocks[block.id] = block;
    const canvas = await block.createCanvas();
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
      this.addDistrict(new TerrainBlock(map));
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
  const me = new Character(2, 2, 1, "char/juni/juni_");
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
export {
  LoadScope
};
/*! Cell v0.5.0 | Copyright 2024 Yoshiya Hinosawa and Capsule contributors | MIT license */
