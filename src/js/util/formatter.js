const dateTimeFormat = new Intl.DateTimeFormat('de-DE', {
  year: '2-digit', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
});
/**
 * Formats a unix timestamp as readable string representation.
 *
 * @param {number|string} time utc unix timestamp
 */
function formatDateTime(time) {
  return dateTimeFormat.format(new Date(time));
}

/**
 * Replaces a string in a given value.
 *
 * @param {string} value value to format
 * @param {string} options defines search and replacement separated by a pipe
 * @returns formatted string
 */
function formatReplace(value, options) {
  const [search, replacement] = options.split('|');
  return `${value}`.replaceAll(search, replacement);
}

/**
 * Formats a timespan as separate values for second, minute...
 *
 * @param {string|number} value to format
 * @returns formatted timespan
 */
function formatTimespan(value) {
  value = parseInt(`${value}`, 10);
  if (isNaN(value)) {
    return '';
  }
  const days = Math.floor(value / 86400);
  value %= 86400;
  const hours = Math.floor(value / 3600);
  value %= 3600;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;

  return `${days ? `${days}d ` : ''}${hours ? `${hours}h ` : ''}${minutes ? `${minutes}m ` : ''}${seconds ? `${seconds}s` : ''}`;
}

/**
 * Formats a value by choosing a formatter using given formatterString.
 *
 * @param {string} formatterString defines formatter and options
 * @param {string|number|boolean} value value to format
 * @returns formatted string
 */
export function format(formatterString, value) {
  const [formatter, options] = formatterString?.split(':') ?? [];
  switch (formatter) {
    case 'dateTime':
      return formatDateTime(value);
    case 'timespan':
      return formatTimespan(value);
    case 'replace':
      return formatReplace(value, options);
    default:
      return value;
  }
}
