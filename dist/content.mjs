import cacheApi from './cache.mjs';
import './index.d1ea82df.mjs';
import 'qs';
import './find.fd7de00e.mjs';
import './round.a606b844.mjs';
import 'deepmerge';
import 'fast-case';

function methods(request, opt) {
  return {
    get: (type, id, query) => {
      return cacheApi.getFetch(`content_${type}`, id, () =>
        request('get', `/content/${type}`, id, {
          $preview: opt.previewContent,
          ...(query || {}),
        }),
      );
    },

    list: (type, query) => request('get', `/content/${type}`, undefined, query),
  };
}

export { methods as default };
