import { d as defaultMethods } from './index.d1ea82df.mjs';
import cacheApi from './cache.mjs';
import 'qs';
import './find.fd7de00e.mjs';
import './round.a606b844.mjs';
import 'deepmerge';
import 'fast-case';

function methods(request) {
  const { get, list } = defaultMethods(request, '/attributes', ['list', 'get']);

  return {
    get: (id, ...args) => {
      return cacheApi.getFetch('attributes', id, () => get(id, ...args));
    },

    list,
  };
}

export { methods as default };
