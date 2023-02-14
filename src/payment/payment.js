import get from 'lodash-es/get';
import cartApi from '../cart';
import settingsApi from '../settings';
import { vaultRequest, isFunction, toSnake } from '../utils';
import loadScripts from '../utils/script-loader';

export default class Payment {
  constructor(request, options, params, method) {
    this.request = request;
    this.options = options;
    this.params = params;
    this.method = method;
  }

  async loadScripts(scripts) {
    await loadScripts(scripts);
  }

  async getCart() {
    const cart = await cartApi(this.request, this.options).get();

    if (!cart) {
      throw new Error('Cart not found');
    }

    return toSnake(cart);
  }

  async updateCart(data) {
    return cartApi(this.request, this.options).update(data);
  }

  async getSettings() {
    return settingsApi(this.request, this.options).get();
  }

  async createIntent(data) {
    return this._vaultRequest('post', '/intent', data);
  }

  async updateIntent(data) {
    return this._vaultRequest('put', '/intent', data);
  }

  async authorizeGateway(data) {
    return this._vaultRequest('post', '/authorization', data);
  }

  onSuccess(data) {
    const successHandler = get(this.params, 'onSuccess');

    if (isFunction(successHandler)) {
      return successHandler(data);
    }
  }

  onCancel() {
    const cancelHandler = get(this.params, 'onCancel');

    if (isFunction(cancelHandler)) {
      return cancelHandler();
    }
  }

  onError(error) {
    const errorHandler = get(this.params, 'onError');

    if (isFunction(errorHandler)) {
      return errorHandler(error);
    }

    console.error(error.message);
  }

  async _vaultRequest(method, url, data) {
    const response = await vaultRequest(method, url, data);

    if (response.errors) {
      const param = Object.keys(response.errors)[0];
      const err = new Error(response.errors[param].message || 'Unknown error');
      err.code = 'vault_error';
      err.status = 402;
      err.param = param;
      throw err;
    }

    return response;
  }
}
