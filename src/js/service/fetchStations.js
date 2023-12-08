import config from "../../config.js";
import { applyFilters, sortByProp } from "./helper.js";

/**
 * Fetches data from remotes.
 */
export class DataFetcher {
  /** base set @type{Object.<string, any>[]} */
  #fetchedSet = {};
  /** stations map @type{Object.<string, any>[]} */
  #stations;
  /** instance @type{DataFetcher} */
  static #instance;

  /** use singleton */
  static getInstance() {
    if (!DataFetcher.#instance) {
      DataFetcher.#instance = new DataFetcher();
    }
    return DataFetcher.#instance;
  }

  /**
   * Fetches station data sets.
   */
  getStations(water) {
    return async (offset = 0, amount = 25, sort = { dir: 'asc', prop: 'name' }, filters = []) => {
      const remoteFilters = filters.filter(filter => filter.startsWith('station:')).map(filter => filter.replace('station:', ''));
      this.#stations = (await this.#fetchSet(water, remoteFilters)).map(station => {
        const current = station.timeseries[0]?.currentMeasurement;
        const hhw = station.timeseries[0]?.characteristicValues.find(c => c.shortname === 'HHW');
        const nnw = station.timeseries[0]?.characteristicValues.find(c => c.shortname === 'NNW');
        return {
          name: station.shortname,
          timestamp: new Date(current.timestamp).getTime(),
          currentLevel: `${current?.value} ${station.timeseries[0]?.unit ?? ''}`,
          highestLevel: `${hhw?.value ?? ''} ${hhw?.unit ?? ''}`,
          lowestLevel: `${nnw?.value ?? ''} ${nnw?.unit ?? ''}`,
          raw: station
        };
      });
      const clientFilters = filters
        .filter(filter => !filter.includes(':'))
        .map(filter => /^(<|>)/.test(filter) ? `currentLevel:${filter}` : filter);
      const total = sortByProp(applyFilters(this.#stations, clientFilters), sort);
      const page = total.slice(offset, offset + amount);
      return {
        page,
        total: total.length,
        pages: Math.ceil(total.length / amount),
        offset,
        amount
      };
    };
  }

  /**
   * Fetches stations lazy.
   */
  async #fetchSet(water, ids) {
    const idsQuery = ids.join(',');
    const key = water + idsQuery;
    if (!this.#fetchedSet[key]) {
      const url = config.stations.replace('{WATER}', water).replace('{IDS}', idsQuery);
      const response = await fetch(url, { cache: "no-cache" });
      this.#fetchedSet[key] = await response.json();
    }
    return this.#fetchedSet[key];
  }
}
