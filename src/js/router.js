/** param change event is emitted, if params have changed */
export const PARAM_CHANGE_EVENT = 'paramChange';
/** path change event is emitted, if path has changed */
export const PATH_CHANGE_EVENT = 'pathChange';

/**
 * Router handles routing in a single document using hash values.
 */
export class Router {
  /** allowed routing paths @type {string[]} */
  #allowedPaths = [];
  /** current path @type {string} */
  #currentPath = '#';
  /** initial params @type {URLSearchParams} */
  #initialParams;
  /** param map for each path @type {Object.<string, Map.<string, string|number|boolean>>} */
  #paramMap = {};
  /** global allowed params @type {Object.<string,{parser: (value: any) => any,validator: (value: any) => boolean, defaultValue: any}>} */
  #paramDef = {};
  /** outlet allowed params @type {Object.<string, Object.<string,{parser: (value: any) => any,validator: (value: any) => boolean, defaultValue: any}>>} */
  #paramOutletDef = {};
  /** singleton instance @type {Router} */
  static instance;

  /** setup router */
  constructor() {
    // save initial values
    const { path, params } = this.#parseHash();
    this.#currentPath = path || '#';
    this.#initialParams = params;

    // register hashchange event -> user input only
    addEventListener('hashchange', () => {
      let { path, params } = this.#parseHash();
      path = this.#allowedPaths.includes(path) ? path : this.#allowedPaths[0];
      const event = path === this.#currentPath ? 'paramChange' : 'pathChange';
      this.#currentPath = path || '#';
      this.#paramMap[this.#currentPath] = new Map();
      params.forEach((value, key) => this.#setParam(key, value));
      this.#stringifyHash(true);
      dispatchEvent(new Event(event));
    });
  }

  /** implement singleton pattern */
  static getInstance() {
    if (!Router.instance) {
      Router.instance = new Router();
    }
    return Router.instance;
  }

  /**
   * Registers an allowed url param
   *
   * @param {string} name param name
   * @param {{parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: string|number }} config
   * @param {boolean} outlet
   */
  registerParam(name, config, outlet = false) {
    if (outlet && !this.#paramOutletDef[this.#currentPath]) {
      this.#paramOutletDef[this.#currentPath] = {};
    }
    const map = outlet ? this.#paramOutletDef[this.#currentPath] : this.#paramDef;
    map[name] = { ...config };
    if (this.#initialParams.has(name)) {
      this.#setParam(name, this.#initialParams.get(name));
      this.#stringifyHash(true);
    }
  }

  /**
   * Configures allowed router paths.
   *
   * @param {string[]} paths to use
   */
  configure(paths) {
    if (paths && paths.length > 0) {
      this.#allowedPaths = paths;
      this.#navigate(this.#allowedPaths.includes(this.#currentPath) ? this.#currentPath : this.#allowedPaths[0]);
    }
  }

  /**
   * Navigates to given path and triggers pathChange event.
   *
   * @param {string} path to navigate to
   */
  navigate(path) {
    if (this.#allowedPaths.length === 0) {
      throw new Error('No allowed paths configured.');
    }
    if (!this.#allowedPaths.includes(path)) {
      path = this.#allowedPaths[0];
    }
    if (this.#currentPath !== path) {
      this.#navigate(path);
    }
  }

  /**
   * Sets a param in router state and triggers paramChange event.
   *
   * @param {string} name param name
   * @param {string} value to set
   */
  setParam(name, value) {
    this.#setParam(name, value);
    this.#stringifyHash();
    dispatchEvent(new CustomEvent(PARAM_CHANGE_EVENT, { detail: { name } }));
  }

  /**
   * Set many params.
   *
   * @param  {...{name: string, value: any}} params
   */
  setManyParams(...params) {
    params.forEach(param => this.#setParam(param.name, param.value));
    this.#stringifyHash();
    dispatchEvent(new Event(PARAM_CHANGE_EVENT));
  }

  /**
   * Returns a param from state or if not available default value from param definition.
   *
   * @param {string} name param name
   * @returns param value
   */
  getParam(name) {
    const value = this.#paramMap[this.#currentPath]?.get(name);
    if (value) {
      return value;
    }
    if (this.#paramOutletDef[this.#currentPath] && this.#paramOutletDef[this.#currentPath][name]) {
      return this.#paramOutletDef[this.#currentPath][name].defaultValue;
    }
    return this.#paramDef[name]?.defaultValue;
  }

  /**
   * Returns current path.
   *
   * @returns current path
   */
  currentPath() {
    return this.#currentPath;
  }

  /** internal navigate method, without event triggering */
  #navigate(path) {
    this.#currentPath = path;
    this.#stringifyHash();
    dispatchEvent(new Event(PATH_CHANGE_EVENT));
  }

  /** internal set param without event triggering */
  #setParam(name, value) {
    const isOutlet = this.#paramOutletDef[this.#currentPath] && this.#paramOutletDef[this.#currentPath][name];
    const parser = isOutlet ? this.#paramOutletDef[this.#currentPath][name].parser : this.#paramDef[name]?.parser;
    const validator = isOutlet ? this.#paramOutletDef[this.#currentPath][name].validator : this.#paramDef[name]?.validator;
    if (parser && validator) {
      const parsed = parser(value);
      if (!validator(parsed)) {
        return;
      }
      if (!this.#paramMap[this.#currentPath]) {
        this.#paramMap[this.#currentPath] = new Map();
      }
      if (parsed) {
        this.#paramMap[this.#currentPath].set(name, parsed);
      } else {
        this.#paramMap[this.#currentPath].delete(name);
      }
    }
  }

  /**
   * Parses url hash.
   *
   * @returns path and params from hash
   */
  #parseHash() {
    const [path, search] = location.hash.split('?');
    return { path, params: new URLSearchParams(search) };
  }

  /**
   * Writes router state to hash.
   *
   * @param {boolean} replace if true, no history entry is written
   */
  #stringifyHash(replace = false) {
    const hash = `${this.#currentPath}${this.#paramMap[this.#currentPath]?.size > 0 ? `?${new URLSearchParams(this.#paramMap[this.#currentPath]).toString()}` : ''}`;
    if (replace) {
      history.replaceState(null, '', hash);
    } else {
      history.pushState(null, '', hash);
    }
  }
}
// be sure to have an early router instance to get url params
(function () {
  Router.getInstance();
})();

const DATA_ATTR_ROUTER_VIEW = 'data-router-view';
const DATA_ATTR_ROUTER_VIEWS = 'data-router-views';
/**
 * Defines router outlet component to render page contents.
 */
customElements.define('router-outlet', class RouterOutlet extends HTMLElement {
  /** views to handle @type {{view: Element, path: string}[]} */
  #views;
  /** active view @type {Element} */
  #active;

  /** setup component */
  constructor() {
    super();
    const viewList = this.getAttribute(DATA_ATTR_ROUTER_VIEWS);
    const defaultViewTpl = this.querySelector(`router-outlet>template:not([${DATA_ATTR_ROUTER_VIEW}])`)?.content;
    let views;
    if (viewList && defaultViewTpl) {
      views = viewList.split(',').map(view => ({ path: view, content: defaultViewTpl.cloneNode(true) }));
    } else {
      views = Array.from(this.querySelectorAll(`router-outlet>template[${DATA_ATTR_ROUTER_VIEW}]`))
        .map(view => ({ path: view.getAttribute(DATA_ATTR_ROUTER_VIEW), content: view.content }));
    }
    this.#views = views.map(view => {
      if (view.path) {
        const wrapper = document.createElement('div');
        wrapper.appendChild(view.content);
        return { view: wrapper, path: view.path };
      }
    });
    const router = Router.getInstance();
    addEventListener(PATH_CHANGE_EVENT, () => {
      this.#active?.remove();
      this.#active = this.#views.find(view => view.path === router.currentPath())?.view;
      this.appendChild(this.#active);
    });
    if (this.#views.length > 0) {
      router.configure(this.#views.map(view => view.path));
    }
  }
});

const DATA_ATTR_ROUTER_LINK = 'data-router-link';
/**
 * Defines a component to trigger router navigation.
 */
customElements.define('router-link', class RouterLink extends HTMLElement {
  /** element to trigger navigation @type {Element} */
  #trigger;
  /** target path @type {string} */
  #path;

  /** setup component */
  constructor() {
    super();
    this.#trigger = this.querySelector(`[${DATA_ATTR_ROUTER_LINK}]`);
    if (this.#trigger) {
      this.#path = this.#trigger.getAttribute(DATA_ATTR_ROUTER_LINK);
      const router = Router.getInstance();
      if (router.currentPath() === this.#path) {
        this.#trigger.classList.add('selected');
      }
      const clickHandler = (event) => {
        event.preventDefault();
        router.navigate(this.#path);
      };
      this.#trigger.addEventListener('click', clickHandler);
      this.#trigger.clickHandler = clickHandler;
      addEventListener(PATH_CHANGE_EVENT, () => {
        if (router.currentPath() === this.#path) {
          this.#trigger.classList.add('selected');
        } else {
          this.#trigger.classList.remove('selected');
        }
      });
    }
  }
});
