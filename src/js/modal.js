/**
 * Class to handle modal dialogs.
 */
export class Modal {
  /** instance @type{Modal} */
  static #instance;
  /** all dialogs @type{Object.<string, HTMLDialogElement>} */
  #dialogs;
  /** current open dialog @type{string} */
  #opened;
  /** action @type {(event: Event) => void | Promise<void>} */
  #action;
  /** close disabled @type {boolean} */
  #closeDisabled = false;

  static getInstance() {
    if (!Modal.#instance) {
      Modal.#instance = new Modal();
    }
    return Modal.#instance;
  }

  constructor() {
    this.#dialogs = Array.from(document.querySelectorAll('dialog'))
      .reduce((memo, dialog) => {
        const id = dialog.getAttribute('id') ?? 'default';
        memo[id] = dialog;
        return memo;
      }, {});

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.#opened) {
        this.close();
      }
    });
  }

  /**
   * Opens dialog by given string otherwise default modal.
   *
   * @param {string} id
   */
  open(id = 'default') {
    this.close();
    if (this.#dialogs[id]) {
      if (this.#isScrollbarVisible()) {
        document.documentElement.style.setProperty("--scrollbar-width", `${this.#getScrollbarWidth()}px`);
      }
      this.#opened = id;
      this.#dialogs[id].setAttribute('open', 'true');
    }
  }

  /**
   * Opens dialog by given id otherwise default dialog and registers action.
   *
   * @param {(event: Event) => void} action action to register
   * @param {string} id dialog id
   */
  openWithAction(action, id) {
    this.#action = typeof action === 'function' ? action : undefined;
    this.open(id);
  }

  /**
   * Closes modal.
   */
  close() {
    if (this.#opened && this.#dialogs[this.#opened] && !this.#closeDisabled) {
      document.documentElement.style.removeProperty("--scrollbar-width");
      this.#dialogs[this.#opened].removeAttribute('open');
      this.#opened = undefined;
      this.#action = undefined;
    }
  }

  /**
   * Returns content element.
   *
   * @param {string} id to use
   * @returns {HTMLElement}
   */
  getContent(id = 'default') {
    if (id && this.#dialogs[id]) {
      const content = this.#dialogs[id].firstElementChild;
      if (content.tagName === 'DIALOG-OUTLET') {
        return content.getContent();
      }
      return content;
    }
  }

  /**
   * Sets data on dialog-outlet.
   *
   * @param {any} data
   * @param {string} id
   */
  setData(data, id = 'default') {
    if (id && this.#dialogs[id]) {
      const content = this.#dialogs[id].firstElementChild;
      if (content.tagName === 'DIALOG-OUTLET') {
        content.data = data;
      }
    }
  }

  /**
   * Triggers registered action.
   *
   * @param {Event} event.
   */
  async runAction(event) {
    if (this.#action) {
      this.#closeDisabled = true;
      let result = this.#action(event);
      if (result instanceof Promise) {
        result = await result;
      }
      this.#closeDisabled = false;
      if (result) {
        this.close();
      }
    }
  }

  /**
   * Returns visbility of scrollbar.
   *
   * @returns true if visible
   */
  #isScrollbarVisible() {
    return document.body.scrollHeight > screen.height;
  }

  /**
   * Returns scrollbar width.
   *
   * @returns scrollbar width
   */
  #getScrollbarWidth() {
    // Creating invisible container
    const outer = document.createElement("div");
    outer.style.visibility = "hidden";
    outer.style.overflow = "scroll"; // forcing scrollbar to appear
    outer.style.msOverflowStyle = "scrollbar"; // needed for WinJS apps
    document.body.appendChild(outer);

    // Creating inner element and placing it in the container
    const inner = document.createElement("div");
    outer.appendChild(inner);

    // Calculating difference between container's full width and the child width
    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;

    // Removing temporary elements from the DOM
    outer.parentNode.removeChild(outer);

    return scrollbarWidth;
  }
}
