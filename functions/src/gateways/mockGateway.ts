/**
 * Mock Payment Gateway Adapter
 * For local development and testing
 */

import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResponse,
  GatewayVerifyResponse,
  GatewayRefundRequest,
  GatewayRefundResponse,
  GatewayWebhookEvent,
} from './types';

interface MockPaymentStore {
  reference: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  paidAt?: Date;
  metadata?: Record<string, unknown>;
}

// In-memory store for mock payments
const mockPayments = new Map<string, MockPaymentStore>();

export class MockGatewayAdapter implements PaymentGatewayAdapter {
  readonly name = 'mock';
  readonly environment: 'sandbox' | 'production' = 'sandbox';

  private simulateFailureRate = 0;
  private simulateNetworkDelay = 0;

  constructor(options?: { failureRate?: number; networkDelayMs?: number }) {
    this.simulateFailureRate = options?.failureRate ?? 0;
    this.simulateNetworkDelay = options?.networkDelayMs ?? 0;
  }

  private async delay(): Promise<void> {
    if (this.simulateNetworkDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.simulateNetworkDelay));
    }
  }

  private shouldFail(): boolean {
    return Math.random() < this.simulateFailureRate;
  }

  async initializeCharge(request: GatewayChargeRequest): Promise<GatewayChargeResponse> {
    await this.delay();

    if (this.shouldFail()) {
      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: 'Simulated gateway failure',
      };
    }

    const gatewayRef = `MOCK_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    mockPayments.set(request.reference, {
      reference: request.reference,
      amount: request.amount,
      status: 'pending',
      metadata: request.metadata,
    });

    return {
      success: true,
      reference: request.reference,
      gatewayReference: gatewayRef,
      status: 'pending',
      authorizationUrl: `https://mock-gateway.local/pay/${request.reference}`,
      accessCode: gatewayRef,
      rawResponse: {
        mock: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  async verifyPayment(reference: string): Promise<GatewayVerifyResponse> {
    await this.delay();

    const payment = mockPayments.get(reference);

    if (!payment) {
      return {
        success: false,
        reference,
        status: 'failed',
        amount: 0,
        rawResponse: { error: 'Payment not found' },
      };
    }

    // Simulate auto-success for testing (payment completes on verify)
    payment.status = 'success';
    payment.paidAt = new Date();
    mockPayments.set(reference, payment);

    return {
      success: true,
      reference,
      gatewayReference: `MOCK_VERIFY_${Date.now()}`,
      status: 'success',
      amount: payment.amount,
      paidAt: payment.paidAt,
      channel: 'mock_channel',
      currency: 'NGN',
      rawResponse: { mock: true },
    };
  }

  async processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    await this.delay();

    if (this.shouldFail()) {
      return {
        success: false,
        reference: request.gatewayReference,
        status: 'failed',
        amount: 0,
        message: 'Simulated refund failure',
      };
    }

    return {
      success: true,
      reference: `REFUND_${Date.now()}`,
      gatewayReference: request.gatewayReference,
      status: 'success',
      amount: request.amount ?? 0,
      message: 'Mock refund processed',
      rawResponse: { mock: true },
    };
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    // Mock validation: accept 'valid-signature' or any signature starting with 'test_'
    return signature === 'valid-signature' || signature.startsWith('test_');
  }

  parseWebhookEvent(payload: Record<string, unknown>): GatewayWebhookEvent {
    const event = payload.event as string || 'charge.success';
    const data = payload.data as Record<string, unknown> || {};

    return {
      event,
      data: {
        reference: (data.reference as string) || '',
        amount: (data.amount as number) || 0,
        currency: (data.currency as string) || 'NGN',
        status: (data.status as string) || 'success',
        gatewayReference: data.gatewayReference as string,
        paidAt: data.paidAt as string,
        metadata: data.metadata as Record<string, unknown>,
      },
      rawPayload: payload,
    };
  }

  async chargeAuthorization(
    request: GatewayChargeRequest & { authorizationCode: string }
  ): Promise<GatewayChargeResponse> {
    await this.delay();

    if (this.shouldFail()) {
      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: 'Simulated authorization charge failure',
      };
    }

    const gatewayRef = `MOCK_AUTH_${Date.now()}`;

    mockPayments.set(request.reference, {
      reference: request.reference,
      amount: request.amount,
      status: 'success',
      paidAt: new Date(),
      metadata: request.metadata,
    });

    return {
      success: true,
      reference: request.reference,
      gatewayReference: gatewayRef,
      status: 'success',
      rawResponse: {
        mock: true,
        authorizationCode: request.authorizationCode,
        chargedAt: new Date().toISOString(),
      },
    };
  }

  // Test helper methods
  static clearMockPayments(): void {
    mockPayments.clear();
  }

  static getMockPayment(reference: string): MockPaymentStore | undefined {
    return mockPayments.get(reference);
  }

  static setMockPaymentStatus(
    reference: string,
    status: 'pending' | 'success' | 'failed'
  ): void {
    const payment = mockPayments.get(reference);
    if (payment) {
      payment.status = status;
      if (status === 'success') {
        payment.paidAt = new Date();
      }
      mockPayments.set(reference, payment);
    }
  }
}

// Default export for convenience
export const mockGateway = new MockGatewayAdapter();
