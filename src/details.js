import { Modal } from "./js/modal.js";

const DIALOG_ID = 'station-details';

/** Attaches a trigger to open a details dialog. */
customElements.define('station-details', class StationDetails extends HTMLElement {
  /** modal instance @type {Modal} */
  #modal = Modal.getInstance();
  /** setup component */
  constructor() {
    super();
    const btn = this.querySelector('button');
    btn?.addEventListener('click', (event) => {
      event.preventDefault();
      this.#modal.setData(this.data, DIALOG_ID);
      this.#modal.open(DIALOG_ID);
    });
  }
});

/** Render client details content. */
customElements.define('station-details-content', class StationDetailsContent extends HTMLElement {
  /** setup component */
  constructor() {
    super();
  }

  /** render details */
  connectedCallback() {
    const data = this.closest('dialog-outlet')?.data;
    if (!data) {
      return;
    }
    const heading = this.querySelector('h3');
    heading.textContent = `Details für [${data.row.name}].`;
    const pre = this.querySelector('pre');
    if (pre) {
      const station = { ...data.row.raw };
      pre.textContent = JSON.stringify(station);
    }
  }

  disconnectedCallback() {
    this.querySelector('div>pre')?.remove();
  }
});
