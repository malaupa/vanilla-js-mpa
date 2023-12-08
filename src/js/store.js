import { PARAM_CHANGE_EVENT, PATH_CHANGE_EVENT, Router } from "./router.js";

export const DEFAULT_STORE = 'default';

/** holds simple stores */
const simpleStores = {};
/** handles inject requests */
export default new Proxy({}, {
  get(_, prop) {
    if (prop === 'RouterStore') {
      return new RouterStore();
    }
    if (prop === 'OutletRouterStore') {
      return new RouterStore(true);
    }
    if (!simpleStores[prop]) {
      simpleStores[prop] = new SimpleStore();
    }
    return simpleStores[prop];
  }
});

/**
 * Class to handle state through router.
 */
class RouterStore {
  /** router @type {Router} */
  #router = Router.getInstance();
  /** outlet @type {boolean} */
  #outlet;

  constructor(outlet = false) {
    this.#outlet = outlet;
  }
  /**
   * Create new router store.
   *
   * @param {Object.<string, {parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: any}>} params to register
   * @param {() => void} changeListener
   */
  init(params, changeListener) {
    Object.keys(params).forEach(param =>
      this.#router.registerParam(param, params[param], this.#outlet));
    if (typeof changeListener === 'function') {
      addEventListener(PARAM_CHANGE_EVENT, changeListener);
      if (!this.#outlet) {
        addEventListener(PATH_CHANGE_EVENT, changeListener);
      }
    }
  }

  /**
   * Gets value from store.
   *
   * @param {string} name param name
   * @returns value
   */
  get(name) {
    return this.#router.getParam(name);
  }

  /**
   * Sets value in store.
   *
   * @param {string} name param name
   * @param {any} value
   */
  set(name, value) {
    this.#router.setParam(name, value);
  }

  /**
   * Set many params.
   *
   * @param  {...{name: string, value: string}} params
   */
  setMany(...params) {
    this.#router.setManyParams(...params);
  }
}

/**
 * Class to handle state in memory.
 */
class SimpleStore extends Map {
  /** params @type{Object.<string, {parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: any}>} */
  #params = {};
  /** changeListener @type {(() => void)[]} */
  #changeListeners = [];

  constructor() {
    super();
  }

  /**
   * Create new router store.
   *
   * @param {Object.<string, {parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: any}>} params to register
   * @param {() => void} changeListener
   */
  init(params, changeListener) {
    this.#params = { ...this.#params, ...params };
    if (typeof changeListener === 'function') {
      this.#changeListeners.push(changeListener);
    }
  }

  /**
   * Gets value from store.
   *
   * @param {string} name
   * @returns value
   */
  get(name) {
    return super.get(name) ?? this.#params[name]?.defaultValue;
  }

  /**
   * Sets value in store.
   *
   * @param {string} name
   * @param {any} value
   */
  set(name, value) {
    this.#set(name, value);
    this.#changeListeners.forEach(listener => listener());
  }

  /**
   * Set many params.
   *
   * @param  {...{name: string, value: string}} params
   */
  setMany(...params) {
    params.forEach(param => this.#set(param.name, param.value));
    this.#changeListeners.forEach(listener => listener());
  }

  /** clears store */
  clear() {
    super.clear();
    this.#changeListeners.forEach(listener => listener());
  }

  /**
   * Sets value in store without listener trigger.
   *
   * @param {string} name
   * @param {any} value
   */
  #set(name, value) {
    if (!this.#params[name]) {
      return;
    }
    const parsed = this.#params[name].parser(value);
    if (this.#params[name].validator(parsed)) {
      super.set(name, value);
    }
  }
}
