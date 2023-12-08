/** Enhances a pre filled with a JSON string to a clickable collapsed JSON tree. */
customElements.define('json-tree', class JsonTree extends HTMLElement {
  /** adds event listener to collapse and expand tree. */
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.target instanceof HTMLAnchorElement) {
        const span = event.target.closest('span');
        span.hidden = true;
        if (span.hasAttribute('data-collapsed')) {
          span.nextElementSibling.hidden = false;
        } else {
          span.previousElementSibling.hidden = false;
          span.querySelectorAll('span[data-open]:not([hidden])>a').forEach(elem => elem.click());
        }
      }
    });
  }

  /** renders new content using pretty printed JSON string */
  connectedCallback() {
    let jsonString = this.querySelector('json-tree>pre')?.textContent;
    try {
      const lines = JSON.stringify(JSON.parse(jsonString), null, 3).split(/\n/);
      let html = '';
      lines.forEach((line, index) => {
        let match = line.match(/^(\s*)("[^"]*":\s*)?([\{\[])$/);
        if (match) {
          html += `${match[1]}<span ${index === 0 ? 'hidden' : ''} data-collapsed>${match[2] ?? ''}<a href="#">▶ ${match[3]}...${match[3] === '{' ? '}' : ']'}</a></span>`;
          html += `<span ${index === 0 ? '' : 'hidden'} data-open>${match[2] ?? ''}<a href="#">▼</a> ${match[3]}\n`;
          return;
        }
        match = line.match(/^\s*[\]\}],?$/);
        if (match) {
          html += `${match[0]}</span>\n`;
          return;
        }
        match = line.match(/^(\s*"[^"]*":\s*)([^,\{\}\[\]]*)(,?)$/);
        if (match) {
          const type = match[2].startsWith('"')
            ? 'class="string"'
            : ['true', 'false'].includes(match[2])
              ? 'class="bool"'
              : /^\d/.test(match[2])
                ? 'class="number"'
                : '';
          html += `${match[1]}<ins ${type}>${match[2]}</ins>${match[3]}\n`;
          return;
        }
        html += `${line}\n`;
      });
      this.querySelector('pre').innerHTML = html;
    } catch {
      // no enhancement
    }
  }
});