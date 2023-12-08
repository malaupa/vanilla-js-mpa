import { Modal } from "../modal.js";

const DATA_ATTR_CLOSE = 'data-close';
const DATA_ATTR_ACTION = 'data-action';

customElements.define('dialog-outlet', class DialogOutlet extends HTMLElement {
  /** modal instance @type {Modal} */
  #modal = Modal.getInstance();
  /** content @type{HTMLDivElement} */
  #content;

  constructor() {
    super();
    const tpl = this.querySelector('dialog-outlet>template');
    if (!tpl) {
      throw new Error('template is required.');
    }
    this.#content = document.createElement('div');
    this.#content.appendChild(tpl.content);
    const closeBtn = this.#content.querySelectorAll(`[${DATA_ATTR_CLOSE}]`);
    closeBtn.forEach(close => close.addEventListener('click', (event) => {
      event.preventDefault();
      this.#modal.close();
    }));
    this.#content.querySelector(`[${DATA_ATTR_ACTION}]`)?.addEventListener('click', async (event) => {
      event.preventDefault();
      closeBtn.forEach(btn => btn.setAttribute('disabled', 'disabled'));
      await this.#modal.runAction(event);
      closeBtn.forEach(btn => btn.removeAttribute('disabled'));
    });
    if (this.parentElement instanceof HTMLDialogElement) {
      const observer = new MutationObserver(mutationList => {
        const openChange = mutationList.find(mutation => mutation.type === 'attributes');
        if (openChange) {
          if (this.parentElement.getAttribute('open') === 'true') {
            this.appendChild(this.#content);
          } else {
            this.#content.remove();
          }
        }
      });
      observer.observe(this.parentElement, { attributeFilter: ['open'], attributes: true });
    }
  }

  /**
   * Returns content of dialog.
   *
   * @returns content
   */
  getContent() {
    return this.#content;
  }
});
