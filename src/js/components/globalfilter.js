import Stores, { DEFAULT_STORE } from '../store.js';

/** params */
const PARAM_FILTER = 'filter';
/** data attributes */
const DATA_ATTR_STORE = 'data-store';

/**
 * Defines a global filter input and sets values in store.
 */
customElements.define('global-filter', class GlobalFilter extends HTMLElement {
  /** store */
  #store;
  /** input @type {HTMLInputElement} */
  #input;

  /** setup component */
  constructor() {
    super();
    this.#store = Stores[this.getAttribute(DATA_ATTR_STORE) ?? DEFAULT_STORE];
    this.#input = this.querySelector('input');
    const reset = this.querySelector('a');
    reset?.addEventListener('click', (event) => {
      event.preventDefault();
      this.#input.value = '';
      this.#store.set(PARAM_FILTER, this.#input.value);
    });
    this.#store.init({ [PARAM_FILTER]: { parser: value => value, validator: () => true, defaultValue: '' } }, () => {
      if (this.isConnected) {
        this.#input.value = this.#store.get(PARAM_FILTER);
      }
    });
    if (this.#input) {
      this.#input.value = this.#store.get(PARAM_FILTER);
      this.#input.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
          this.#store.set(PARAM_FILTER, this.#input.value);
        }
      });
    }
  }

  /** on connected */
  connectedCallback() {
    this.#input.value = this.#store.get(PARAM_FILTER);
  }
});