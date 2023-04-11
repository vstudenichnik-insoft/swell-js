const mockPayment = {
  getCart: jest.fn(() => {
    return Promise.resolve({});
  }),

  updateCart: jest.fn(),

  createIntent: jest.fn((params) => {
    const { gateway } = params;

    switch (gateway) {
      case 'amazon':
        return {
          redirect_url: 'https://www.amazon.com/',
        };
      default:
        throw new Error(`Unknown gateway: ${gateway}`);
    }
  }),

  authorizeGateway: jest.fn((params) => {
    const { gateway } = params;

    switch (gateway) {
      case 'amazon':
        return {
          payload: 'test_amazon_session_payload',
          signature: 'test_amazon_session_signature',
        };
      case 'braintree':
        return 'braintree_authorization';
      default:
        throw new Error(`Unknown gateway: ${gateway}`);
    }
  }),

  onSuccess: jest.fn(),
  onCancel: jest.fn(),
  onError: jest.fn(),
};

export default mockPayment;
