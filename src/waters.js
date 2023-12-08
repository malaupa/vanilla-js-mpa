import { Router } from './js/router.js';
import { DataFetcher } from './js/service/fetchStations.js';
import { registerDynamicInject } from './js/util/inject.js';

/**
 * Defines water settings.
 */
customElements.define('water-selector', class Waters extends HTMLElement {
  /** state fetcher */
  #fetcher = DataFetcher.getInstance();
  /** router */
  #router = Router.getInstance();
  /** data table @type {HTMLElement} */
  #dataTable;
  /** element @type {HTMLDivElement} */
  #ctn;

  constructor() {
    super();
    const tpl = this.querySelector('water-selector>template')?.content;
    this.#dataTable = tpl?.querySelector('data-table');
    if (!tpl || !this.#dataTable) {
      return;
    }
    this.#ctn = document.createElement('div');
    this.#ctn.appendChild(tpl);
  }

  connectedCallback() {
    this.#setup();
  }

  disconnectedCallback() {
    this.#ctn?.remove();
  }

  async #setup() {
    if (!this.#ctn) {
      return;
    }
    const water = this.#router.currentPath()?.replace('#', '');
    if (!water) {
      return;
    }
    registerDynamicInject('getStations', this.#fetcher.getStations(water));
    this.appendChild(this.#ctn);
  }
});
