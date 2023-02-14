import Payment from '../payment';
import { isLiveMode } from '../../utils';
import {
  PaymentMethodDisabledError,
  LibraryNotLoaded,
} from '../../utils/errors';

const API_VERSION = 2;
const API_MINOR_VERSION = 0;
const ALLOWED_CARD_AUTH_METHODS = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];
const ALLOWED_CARD_NETWORKS = [
  'AMEX',
  'DISCOVER',
  'INTERAC',
  'JCB',
  'MASTERCARD',
  'VISA',
];

export default class BraintreeGooglePayment extends Payment {
  constructor(request, options, params, methods) {
    if (!methods.card) {
      throw new PaymentMethodDisabledError('Credit cards');
    }

    super(request, options, params, methods.google);
  }

  get scripts() {
    return ['google-pay', 'braintree-web', 'braintree-google-payment'];
  }

  get braintree() {
    if (!window.braintree) {
      throw new LibraryNotLoaded('Braintree');
    }

    return window.braintree;
  }

  get google() {
    if (!window.google) {
      throw new LibraryNotLoaded('Google');
    }

    return window.google;
  }

  get googleClient() {
    if (!BraintreeGooglePayment.googleClient) {
      if (this.google) {
        this.googleClient = new this.google.payments.api.PaymentsClient({
          environment: isLiveMode(this.method.mode) ? 'PRODUCTION' : 'TEST',
        });
      }

      if (!BraintreeGooglePayment.googleClient) {
        throw new LibraryNotLoaded('Google client');
      }
    }

    return BraintreeGooglePayment.googleClient;
  }

  set googleClient(googleClient) {
    BraintreeGooglePayment.googleClient = googleClient;
  }

  get cardPaymentMethod() {
    return {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ALLOWED_CARD_AUTH_METHODS,
        allowedCardNetworks: ALLOWED_CARD_NETWORKS,
        billingAddressRequired: true,
        billingAddressParameters: {
          format: 'FULL',
          phoneNumberRequired: true,
        },
      },
    };
  }

  get allowedPaymentMethods() {
    return [this.cardPaymentMethod];
  }

  async createElements() {
    if (!this.method.merchant_id) {
      throw new Error('Google merchant ID is not defined');
    }

    const isReadyToPay = await this.googleClient.isReadyToPay({
      apiVersion: API_VERSION,
      apiVersionMinor: API_MINOR_VERSION,
      allowedPaymentMethods: this.allowedPaymentMethods,
      existingPaymentMethodRequired: true,
    });

    if (!isReadyToPay.result) {
      throw new Error(
        'This device is not capable of making Google Pay payments',
      );
    }

    this._renderButton();
  }

  _renderButton() {
    const {
      elementId = 'googlepay-button',
      locale = 'en',
      style: { color = 'black', type = 'buy', sizeMode = 'fill' } = {},
      classes = {},
    } = this.params;

    const container = document.getElementById(elementId);

    if (!container) {
      throw new Error(`DOM element with '${elementId}' ID not found`);
    }

    if (classes.base) {
      container.classList.add(classes.base);
    }

    const button = this.googleClient.createButton({
      buttonColor: color,
      buttonType: type,
      buttonSizeMode: sizeMode,
      buttonLocale: locale,
      onClick: this._onClick.bind(this),
    });

    container.appendChild(button);
  }

  async _onClick() {
    try {
      const cart = await this.getCart();
      const paymentRequestData = this._createPaymentRequestData(cart);
      const braintreeClient = await this._createBraintreeClient();
      const googlePayment = await this.braintree.googlePayment.create({
        client: braintreeClient,
        googleMerchantId: this.method.merchant_id,
        googlePayVersion: API_VERSION,
      });
      const paymentDataRequest =
        googlePayment.createPaymentDataRequest(paymentRequestData);
      const paymentData = await this.googleClient.loadPaymentData(
        paymentDataRequest,
      );

      if (paymentData) {
        await this._submitPayment(cart, googlePayment, paymentData);
      }
    } catch (error) {
      this.onError(error);
    }
  }

  async _createBraintreeClient() {
    const authorization = await this.authorizeGateway({
      gateway: 'braintree',
    });

    if (authorization.error) {
      throw new Error(authorization.error.message);
    }

    return this.braintree.client.create({
      authorization,
    });
  }

  _createPaymentRequestData(cart) {
    const {
      settings: { name },
      capture_total,
      currency,
    } = cart;
    const { require: { email, shipping, phone } = {} } = this.params;

    return {
      apiVersion: API_VERSION,
      apiVersionMinor: API_MINOR_VERSION,
      transactionInfo: {
        currencyCode: currency,
        totalPrice: capture_total.toString(),
        totalPriceStatus: 'ESTIMATED',
      },
      allowedPaymentMethods: this.allowedPaymentMethods,
      emailRequired: Boolean(email),
      shippingAddressRequired: Boolean(shipping),
      shippingAddressParameters: {
        phoneNumberRequired: Boolean(phone),
      },
      merchantInfo: {
        merchantName: name,
        merchantId: this.method.merchant_id,
      },
    };
  }

  async _submitPayment(cart, googlePayment, paymentData) {
    const shouldUpdateAccount = !Boolean(cart.account && cart.account.email);
    const { require: { shipping: requireShipping } = {} } = this.params;
    const { nonce } = await googlePayment.parseResponse(paymentData);
    const { email, shippingAddress, paymentMethodData } = paymentData;
    const {
      info: { billingAddress },
    } = paymentMethodData;

    await this.updateCart({
      ...(shouldUpdateAccount && {
        account: {
          email,
          name: shippingAddress ? shippingAddress.name : billingAddress.name,
        },
      }),
      billing: {
        method: 'google',
        google: {
          nonce,
          gateway: 'braintree',
        },
        ...this._mapAddress(billingAddress),
      },
      ...(requireShipping && {
        shipping: this._mapAddress(shippingAddress),
      }),
    });

    this.onSuccess();
  }

  _mapAddress(address) {
    return {
      name: address.name,
      address1: address.address1,
      address2: address.address2,
      city: address.locality,
      state: address.administrativeArea,
      zip: address.postalCode,
      country: address.countryCode,
      phone: address.phoneNumber,
    };
  }
}
