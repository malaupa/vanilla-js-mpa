/**
   * Filters list using filters as regexp.
   *
   * @param {Object.<string, any>[]} list to filter
   * @param {string[]} filters to use
   * @returns filtered list
   */
export function applyFilters(list = [], filters = []) {
  if (filters.length > 0) {
    filters.forEach(filter => {
      filter = filter.trim();
      if (!filter) {
        return;
      }
      const lowerOrHigher = filter.match(/^([^:]+)\:(<|>)(\d+)/);
      if (lowerOrHigher) {
        list = list.filter(entry => {
          const value = parseInt(entry[lowerOrHigher[1]], 10);
          const valueToCompare = parseInt(lowerOrHigher[3], 10);
          return lowerOrHigher[2] === '<' ? value < valueToCompare : value > valueToCompare;
        });
        return;
      }

      const negate = filter.startsWith('!');
      const tester = negate
        ? value => !(new RegExp(filter.replace('!', '')).test(value))
        : value => new RegExp(filter).test(value);
      list = list.filter(entry => Object.values(entry)[negate ? 'every' : 'some'](tester));
    });
  }
  return list;
}

/**
   * Sorts list.
   *
   * @param {Object.<string, any>[]} list to sort
   * @param {{dir: string, prop: string}} sort criteria
   * @returns sorted list
   */
export function sortByProp(list = [], sort = { dir: 'asc', prop: undefined }) {
  return list.sort((a, b) => {
    if (!sort.prop) {
      sort.prop = Object.keys(a)[0];
    }
    if (a[sort.prop] === undefined || b[sort.prop] === undefined) {
      return 0;
    }
    if (typeof a[sort.prop] === 'number' && typeof b[sort.prop] === 'number') {
      if (a[sort.prop] < b[sort.prop]) {
        return sort.dir === 'asc' ? -1 : 1;
      }
      if (a[sort.prop] > b[sort.prop]) {
        return sort.dir === 'asc' ? 1 : -1;
      }
    } else {
      const aString = `${a[sort.prop]}`.toUpperCase();
      const bString = `${b[sort.prop]}`.toUpperCase();
      if (aString < bString) {
        return sort.dir === 'asc' ? -1 : 1;
      }
      if (aString > bString) {
        return sort.dir === 'asc' ? 1 : -1;
      }
    }
    return 0;
  });
}
