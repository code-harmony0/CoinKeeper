/**
 * Mock Gateway Adapter Unit Tests
 */

import { MockGatewayAdapter } from '../src/gateways/mockGateway';

describe('MockGatewayAdapter', () => {
  let gateway: MockGatewayAdapter;

  beforeEach(() => {
    gateway = new MockGatewayAdapter();
    MockGatewayAdapter.clearMockPayments();
  });

  describe('initializeCharge', () => {
    it('initializes a charge successfully', async () => {
      const request = {
        amount: 5000,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'REF123',
        description: 'Test payment',
      };

      const response = await gateway.initializeCharge(request);

      expect(response.success).toBe(true);
      expect(response.reference).toBe('REF123');
      expect(response.status).toBe('pending');
      expect(response.authorizationUrl).toBeDefined();
      expect(response.gatewayReference).toMatch(/^MOCK_/);
    });

    it('stores payment for later verification', async () => {
      await gateway.initializeCharge({
        amount: 5000,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'REF456',
      });

      const stored = MockGatewayAdapter.getMockPayment('REF456');
      expect(stored).toBeDefined();
      expect(stored?.amount).toBe(5000);
      expect(stored?.status).toBe('pending');
    });
  });

  describe('verifyPayment', () => {
    it('verifies and auto-completes payment', async () => {
      await gateway.initializeCharge({
        amount: 3000,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'VERIFY_REF',
      });

      const response = await gateway.verifyPayment('VERIFY_REF');

      expect(response.success).toBe(true);
      expect(response.status).toBe('success');
      expect(response.amount).toBe(3000);
      expect(response.paidAt).toBeDefined();
    });

    it('returns failed for non-existent payment', async () => {
      const response = await gateway.verifyPayment('NONEXISTENT');

      expect(response.success).toBe(false);
      expect(response.status).toBe('failed');
    });
  });

  describe('processRefund', () => {
    it('processes refund successfully', async () => {
      const response = await gateway.processRefund({
        gatewayReference: 'MOCK_123',
        amount: 1000,
        reason: 'Customer request',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('success');
      expect(response.amount).toBe(1000);
    });
  });

  describe('validateWebhookSignature', () => {
    it('accepts valid-signature', () => {
      const isValid = gateway.validateWebhookSignature('{}', 'valid-signature');
      expect(isValid).toBe(true);
    });

    it('accepts test_ prefixed signatures', () => {
      const isValid = gateway.validateWebhookSignature('{}', 'test_abc123');
      expect(isValid).toBe(true);
    });

    it('rejects invalid signatures', () => {
      const isValid = gateway.validateWebhookSignature('{}', 'invalid');
      expect(isValid).toBe(false);
    });
  });

  describe('parseWebhookEvent', () => {
    it('parses webhook payload', () => {
      const payload = {
        event: 'charge.success',
        data: {
          reference: 'REF789',
          amount: 10000,
          currency: 'NGN',
          status: 'success',
        },
      };

      const event = gateway.parseWebhookEvent(payload);

      expect(event.event).toBe('charge.success');
      expect(event.data.reference).toBe('REF789');
      expect(event.data.amount).toBe(10000);
      expect(event.rawPayload).toEqual(payload);
    });
  });

  describe('chargeAuthorization', () => {
    it('charges saved authorization', async () => {
      const response = await gateway.chargeAuthorization({
        amount: 2500,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'AUTH_REF',
        authorizationCode: 'AUTH_CODE_123',
      });

      expect(response.success).toBe(true);
      expect(response.status).toBe('success');
      expect(response.reference).toBe('AUTH_REF');
    });
  });

  describe('failure simulation', () => {
    it('simulates failures when configured', async () => {
      const failingGateway = new MockGatewayAdapter({ failureRate: 1 });

      const response = await failingGateway.initializeCharge({
        amount: 5000,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'FAIL_REF',
      });

      expect(response.success).toBe(false);
      expect(response.status).toBe('failed');
    });
  });

  describe('static helpers', () => {
    it('sets mock payment status', async () => {
      await gateway.initializeCharge({
        amount: 5000,
        currency: 'NGN',
        email: 'test@example.com',
        reference: 'STATUS_REF',
      });

      MockGatewayAdapter.setMockPaymentStatus('STATUS_REF', 'success');

      const stored = MockGatewayAdapter.getMockPayment('STATUS_REF');
      expect(stored?.status).toBe('success');
      expect(stored?.paidAt).toBeDefined();
    });
  });
});
