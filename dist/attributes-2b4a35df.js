import { d as defaultMethods } from './index-20375c1d.js';
import { c as cacheApi } from './cache-54a2837a.js';

function methods(request) {
  const { get, list } = defaultMethods(request, '/attributes', ['list', 'get']);

  return {
    get: (id, ...args) => {
      return cacheApi.getFetch('attributes', id, () => get(id, ...args));
    },

    list,
  };
}

export { methods as m };
