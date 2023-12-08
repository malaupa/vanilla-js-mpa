import Stores, { DEFAULT_STORE } from '../store.js';
/** attributes */
const DATA_ATTR_STORE = 'data-store';
/** params */
const PARAM_AMOUNT = 'amount';

/**
 * Defines a page amount component to set amount parameter in store.
 */
customElements.define('page-amount', class PageAmount extends HTMLElement {
  /** amount select @type {HTMLSelectElement} */
  #select;
  /** store @type {{init: (params: Object.<string, {parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: any}>, listener: () => void) => void, set: (name: string, value: any) => void, get: (name) => any}} */
  #store;

  /** setup component */
  constructor() {
    super();
    this.#store = Stores[this.getAttribute(DATA_ATTR_STORE) ?? DEFAULT_STORE];
    // extract select and options to get available amounts to select
    this.#select = this.querySelector('select');
    if (!this.#select) {
      throw new Error('Define a select element with options as child of the component.');
    }
    const options = Array.from(this.#select.querySelectorAll('option')).map(option => {
      const parsed = parseInt(option.textContent, 10);
      if (isNaN(parsed)) {
        throw new Error(`Option value is not a number string: [${option.textContent}]`);
      }
      return parsed;
    });
    if (options.length === 0) {
      throw new Error('At least one option is required.');
    }
    // setup change listener to listen to change of the select
    this.#select.addEventListener('change', (event) => {
      this.#store.set(PARAM_AMOUNT, event.target.value);
    });

    // register amount parameter in the store and get actual value
    this.#store.init(
      {
        [PARAM_AMOUNT]: {
          parser: (value) => parseInt(value, 10),
          validator: (value) => options.includes(value),
          defaultValue: options[0]
        }
      },
      () => {
        if (this.isConnected) {
          this.#select.value = `${this.#store.get(PARAM_AMOUNT)}`;
        }
      });
    this.#select.value = `${this.#store.get(PARAM_AMOUNT)}`;
  }

  /** on connected */
  connectedCallback() {
    this.#select.value = `${this.#store.get(PARAM_AMOUNT)}`;
  }
});