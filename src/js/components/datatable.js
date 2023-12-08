import { format } from '../util/formatter.js';
import { inject } from '../util/inject.js';
import Stores, { DEFAULT_STORE } from '../store.js';

/** default amount, if amount is not available in router state */
const AMOUNT = 25;
/** data attribute definitions */
const DATA_ATTR_SOURCE = 'data-source';
const DATA_ATTR_COLS = 'data-cols';
const DATA_ATTR_COL = 'data-col';
const DATA_ATTR_SORT = 'data-sort';
const DATA_ATTR_FORMATTER = 'data-formatter';
const DATA_ATTR_TOTAL_COUNT = 'data-total-count';
const DATA_ATTR_SLICE = 'data-slice';
const DATA_ATTR_PAGE_TPL = 'data-page-tpl';
const DATA_ATTR_PAGE_PLACEHOLDER = 'data-page-placeholder';
const DATA_ATTR_PAGE_SIBLING = 'data-page-sibling';
const DATA_ATTR_PREV = 'data-prev';
const DATA_ATTR_NEXT = 'data-next';
const DATA_ATTR_PAGE_SELECT = 'data-page-select';
const DATA_ATTR_STORE = 'data-store';
/** params */
const PARAM_SORT = 'sort';
const PARAM_DIR = 'dir';
const PARAM_AMOUNT = 'amount';
const PARAM_FILTER = 'filter';
/** sort dir values */
const ASC = 'asc';
const DESC = 'desc';

/**
 * Defines a table component to show data as paginated list using a given async data source.
 */

customElements.define('data-table', class DataTable extends HTMLElement {
  /** store @type {{init: (params: Object.<string, {parser: (value: any) => any, validator: (value: any) => boolean, defaultValue: any}>, listener: () => void) => void, set: (name: string, value: any) => void, get: (name) => any}} */
  #store;
  /** current offset (amount is defined in router state) @type {number} */
  #offset = 0;
  /** function to get table entries, injected by data source string @type {(offset: number, amount: number, sort: {prop: string, dir: string}, filter: string[]) => Promise.<{page: Object.<string,any>[], total: number, pages: number, length: number, offset: number, amount: number}>} */
  #dataSource;
  /** current fetch data @type {{page: Object.<string,any>[], total: number, pages: number, length: number, offset: number, amount: number}} */
  #data;

  /** @type {DocumentFragment} */
  #tpl;
  /** column templates @type {Object.<string, DocumentFragment>} */
  #colTpl;
  /** @type {HTMLTableSectionElement} */
  #tbody;
  /** data source inject string, defined by data-source @type {string} */
  #dataSourcePath;
  /** columns to render, defined by data-col @type {HTMLTableCellElement[]} */
  #columns = [];
  /** list of column names (aka entry props) @type {string[]} */
  #columnNames = [];
  /** column formatter strings, colName -> formatter string @type {Object.<string, string>} */
  #columnFormatters = {};
  /** element to append page links afterwards, defined by data-page-sibling @type {HTMLElement} */
  #pagePrevSibling;
  /** Page template to use for rendering page links, defined by data-page-tpl @type {HTMLElement} */
  #pageTpl;
  /** All rendered page links @type {HTMLElement[]} */
  #pages = [];
  /** Previous page link, defined by data-prev @type {HTMLElement} */
  #pre;
  /** Next page link, defined by data-next @type {HTMLElement} */
  #next;
  /** Before placeholder element, defined by data-page-placeholder (is rendered if page count is to big) @type {HTMLElement} */
  #beforePlaceholder;
  /** After placeholder element, defined by data-page-placeholder (is rendered if page count is to big) @type {HTMLElement} */
  #afterPlaceholder;
  /** element to set current total entry count in, defined by data-total-count @type {HTMLElement} */
  #totalCount;
  /** element to set current slice in, defined by data-slice @type {HTMLElement} */
  #slice;

  /** setup component */
  constructor() {
    super();
    this.#tpl = this.querySelector(`data-table>template:not([${DATA_ATTR_COL}])`)?.content;
    this.#colTpl = Array.from(this.querySelectorAll(`data-table>template[${DATA_ATTR_COL}]`)).reduce((memo, tpl) => {
      const col = tpl.getAttribute(DATA_ATTR_COL);
      if (col) {
        memo[tpl.getAttribute(DATA_ATTR_COL)] = tpl.content;
      }
      return memo;
    }, {});
    this.#tbody = this.#tpl?.querySelector('tbody');
    if (!this.#tpl || !this.#tbody) {
      throw new Error('Table template is not defined or malformed.');
    }
    this.#store = Stores[this.getAttribute(DATA_ATTR_STORE) ?? DEFAULT_STORE];
    this.#dataSourcePath = this.getAttribute(DATA_ATTR_SOURCE);
    this.#totalCount = this.#tpl.querySelector(`[${DATA_ATTR_TOTAL_COUNT}]`);
    this.#slice = this.#tpl.querySelector(`[${DATA_ATTR_SLICE}]`);
    this.#setupNav();
    this.#setupColumns();
  }

  /** render on connected event */
  connectedCallback() {
    this.#dataSource = undefined;
    this.#reloadAndRender();
  }

  /** 
   * Setup column definitions and apply sort listener.
   */
  #setupColumns() {
    const colList = this.getAttribute(DATA_ATTR_COLS);
    const tableHeadRow = this.#tpl.querySelector('table>thead>tr');
    if (colList && tableHeadRow) {
      colList.split(',').forEach(col => {
        const [colName, tplName] = col.split(':');
        if (tplName) {
          this.#colTpl[colName] = this.#colTpl[tplName];
        }
        const colElem = document.createElement('th');
        colElem.textContent = colName;
        colElem.setAttribute(DATA_ATTR_COL, colName);
        tableHeadRow.appendChild(colElem);
      });
    }
    this.#columns = Array.from(this.#tpl.querySelectorAll(`[${DATA_ATTR_COL}]`));
    this.#columnNames = this.#columns.map(el => el.getAttribute(DATA_ATTR_COL));
    if (this.#columnNames.length === 0) {
      throw new Error('No columns defined.');
    }
    this.#store.init({
      [PARAM_SORT]: {
        parser: value => value, validator: value =>
          this.#columnNames.includes(value), defaultValue: this.#columnNames[0]
      },
      [PARAM_DIR]: { parser: value => value, validator: value => [DESC, ASC].includes(value), defaultValue: ASC }
    }, () => {
      if (this.isConnected) {
        this.#reloadAndRender();
      }
    });
    const currentColName = this.#store.get(PARAM_SORT);
    const currentDir = this.#store.get(PARAM_DIR);
    this.#columns.forEach(col => {
      if (col.getAttribute(DATA_ATTR_SORT) === 'true') {
        const colName = col.getAttribute(DATA_ATTR_COL);
        this.#columnFormatters[colName] = col.getAttribute(DATA_ATTR_FORMATTER);
        if (currentColName === colName) {
          col.classList.add(`sort-${currentDir}`);
        }
        col.addEventListener('click', () => {
          const dir = this.#store.get(PARAM_DIR) === ASC ? DESC : ASC;
          this.#columns.forEach(col => col.classList.remove(`sort-${ASC}`, `sort-${DESC}`));
          col.classList.add(`sort-${dir}`);
          this.#store.setMany({ name: PARAM_SORT, value: colName }, { name: PARAM_DIR, value: dir });
        });
      }
    });
  }

  /** 
   * setup page navigation
   */
  #setupNav() {
    this.#pageTpl = this.#tpl.querySelector(`[${DATA_ATTR_PAGE_TPL}]`)?.content.firstElementChild;
    const placeholder = this.#tpl.querySelector(`[${DATA_ATTR_PAGE_PLACEHOLDER}]`)?.content.firstElementChild;
    this.#beforePlaceholder = placeholder?.cloneNode(true);
    this.#afterPlaceholder = placeholder?.cloneNode(true);
    this.#pagePrevSibling = this.#tpl.querySelector(`[${DATA_ATTR_PAGE_SIBLING}]`);
    this.#pre = this.#tpl.querySelector(`[${DATA_ATTR_PREV}]`);
    this.#pre?.addEventListener('click', this.#previousPage.bind(this));
    this.#next = this.#tpl.querySelector(`[${DATA_ATTR_NEXT}]`);
    this.#next?.addEventListener('click', this.#nextPage.bind(this));
  }

  /**
   * Handles previous page click.
   * 
   * @param {Event} event 
   */
  #previousPage(event) {
    event.preventDefault();
    this.#offset = Math.max(0, this.#offset - this.#getAmount());
    this.#render();
  }

  /**
   * Handles next page click.
   * 
   * @param {Event} event 
   */
  #nextPage(event) {
    event.preventDefault();
    const offset = this.#offset + this.#getAmount();
    if (offset < this.#data.total) {
      this.#offset = offset;
      this.#render();
    }
  }

  /**
   * Reloads state and renders table.
   */
  #reloadAndRender() {
    this.#offset = 0;
    const currentColName = this.#store.get(PARAM_SORT);
    const currentDir = this.#store.get(PARAM_DIR);
    this.#columns.forEach(col => col.classList.remove(`sort-${ASC}`, `sort-${DESC}`));
    this.#columns[this.#columnNames.indexOf(currentColName)].classList.add(`sort-${currentDir}`);
    this.#render();
  }

  /**
   * Renders table and appends them to dom.
   */
  async #render() {
    if (!this.#dataSource) {
      this.#dataSource = await inject(this.#dataSourcePath);
    }
    if (this.#dataSource && this.#tbody) {
      const filters = this.#store.get(PARAM_FILTER)?.split(' ') ?? [];
      const sort = { prop: this.#store.get(PARAM_SORT), dir: this.#store.get(PARAM_DIR) };
      this.#data = await this.#dataSource(this.#offset, this.#getAmount(), sort, filters);
      const amount = Math.max(this.#tbody.rows.length, this.#data.page.length);
      for (let i = 0; i < amount; i++) {
        if (this.#data.page.length > i) {
          const newRow = this.#tbody.rows.length == i;
          const row = newRow ? this.#tbody.insertRow(i) : this.#tbody.rows.item(i);
          this.#columnNames.forEach((col, index) => {
            const cell = newRow ? row.insertCell(index) : row.cells.item(index);
            const tpl = this.#colTpl[col];
            if (tpl) {
              Array.from(cell.children).forEach(child => child.remove());
              const cellContent = tpl.cloneNode(true);
              cellContent.firstElementChild.data = { row: this.#data.page[i], col };
              cell.appendChild(cellContent);
            } else {
              cell.textContent = format(this.#columnFormatters[col], this.#data.page[i][col]);
            }
          });
        } else {
          for (let j = i; j < amount; j++) {
            this.#tbody.deleteRow(i);
          }
          break;
        }
      }
      if (this.#totalCount) {
        this.#totalCount.textContent = this.#data.total;
      }
      if (this.#slice) {
        this.#slice.textContent = `${this.#data.offset}-${this.#data.offset + this.#data.page.length}`;
      }
      this.#renderPageNav();
      if (!this.#tpl.isConnected) {
        this.appendChild(this.#tpl);
      }
    }
  }

  /** 
   * Returns amount.
   */
  #getAmount() {
    return this.#store.get(PARAM_AMOUNT) ?? AMOUNT;
  }

  /**
   * Renders page navigation.
   */
  #renderPageNav() {
    this.#pre?.removeAttribute('disabled');
    if (this.#data?.offset === 0) {
      this.#pre?.setAttribute('disabled', 'disabled');
    }
    this.#next?.removeAttribute('disabled');
    if (this.#data?.offset + this.#data?.amount > this.#data?.total) {
      this.#next?.setAttribute('disabled', 'disabled');
    }
    if (this.#data && this.#pageTpl && this.#pagePrevSibling) {
      const selected = this.#data.offset / this.#data.amount;
      const indexes = [];
      const start = selected < 4 ? 1 : selected - (selected > this.#data.pages - 5 ? selected - (this.#data.pages - 5) : 1);
      const end = selected > this.#data.pages - 5 ? this.#data.pages - 1 : selected + (selected < 4 ? 4 - selected : 1);
      for (let i = start; i <= end; i++) {
        indexes.push(i);
      }
      if (start != 0) {
        indexes.unshift(0);
      }
      if (end != this.#data.pages - 1) {
        indexes.push(this.#data.pages - 1);
      }
      this.#pages.forEach(page => {
        const select = page.querySelector(`[${DATA_ATTR_PAGE_SELECT}]`);
        select?.removeEventListener('click', select?.pageListener);
        page.remove();
      });
      this.#pages = [];
      for (let i = 0; i < indexes.length; i++) {
        const page = indexes[i];
        const pageListener = () => {
          this.#offset = page * this.#data.amount;
          this.#render();
        };
        const node = this.#pageTpl.cloneNode(true);
        this.#pages.push(node);
        this.#pages[i - 1] ? this.#pages[i - 1].after(node) : this.#pagePrevSibling.after(node);
        const select = node.querySelector(`[${DATA_ATTR_PAGE_SELECT}]`);
        if (select) {
          select.textContent = page + 1;
          select.addEventListener('click', pageListener);
          select.pageListener = pageListener;
        }
        if (page === selected) {
          select?.setAttribute('disabled', 'disabled');
          select?.classList.add('selected');
        }
      }
      if (indexes.length > 1 && indexes[0] + 1 !== indexes[1]) {
        this.#pages[0].after(this.#beforePlaceholder);
      } else if (this.#beforePlaceholder?.isConnected) {
        this.#beforePlaceholder?.remove();
      }
      if (indexes.length > 1 && indexes[indexes.length - 1] - 1 !== indexes[indexes.length - 2]) {
        this.#pages[this.#pages.length - 1].before(this.#afterPlaceholder);
      } else if (this.#afterPlaceholder?.isConnected) {
        this.#afterPlaceholder?.remove();
      }
    }
  }
});