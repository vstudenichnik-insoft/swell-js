import { d as defaultMethods } from './index-ca9cb73c.js';
import { c as cacheApi } from './cache-b92f4460.js';

function methods(request) {
  const { get, list } = defaultMethods(request, '/categories', ['list', 'get']);

  return {
    get: (id, ...args) => {
      return cacheApi.getFetch('categories', id, () => get(id, ...args));
    },

    list,
  };
}

export { methods as m };
