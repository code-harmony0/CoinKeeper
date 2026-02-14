/**
 * Paystack Payment Gateway Adapter
 * Integration with Paystack API for Nigerian payments
 */

import axios, { AxiosInstance } from 'axios';
import * as crypto from 'crypto';
import {
  PaymentGatewayAdapter,
  GatewayChargeRequest,
  GatewayChargeResponse,
  GatewayVerifyResponse,
  GatewayRefundRequest,
  GatewayRefundResponse,
  GatewayWebhookEvent,
} from './types';

interface PaystackConfig {
  secretKey: string;
  publicKey?: string;
  environment: 'sandbox' | 'production';
}

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackAdapter implements PaymentGatewayAdapter {
  readonly name = 'paystack';
  readonly environment: 'sandbox' | 'production';

  private readonly secretKey: string;
  private readonly client: AxiosInstance;

  constructor(config: PaystackConfig) {
    this.secretKey = config.secretKey;
    this.environment = config.environment;

    this.client = axios.create({
      baseURL: PAYSTACK_BASE_URL,
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  async initializeCharge(request: GatewayChargeRequest): Promise<GatewayChargeResponse> {
    try {
      const response = await this.client.post('/transaction/initialize', {
        email: request.email,
        amount: Math.round(request.amount * 100), // Paystack uses kobo (NGN * 100)
        reference: request.reference,
        callback_url: request.callbackUrl,
        metadata: {
          ...request.metadata,
          custom_fields: [
            {
              display_name: 'Description',
              variable_name: 'description',
              value: request.description || 'Payment',
            },
          ],
        },
      });

      const data = response.data;

      if (data.status) {
        return {
          success: true,
          reference: request.reference,
          gatewayReference: data.data.reference,
          status: 'pending',
          authorizationUrl: data.data.authorization_url,
          accessCode: data.data.access_code,
          rawResponse: data,
        };
      }

      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: data.message || 'Initialization failed',
        rawResponse: data,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: errorMessage,
        rawResponse: { error: errorMessage },
      };
    }
  }

  async verifyPayment(reference: string): Promise<GatewayVerifyResponse> {
    try {
      const response = await this.client.get(`/transaction/verify/${reference}`);
      const data = response.data;

      if (data.status && data.data) {
        const txData = data.data;
        const status = this.mapPaystackStatus(txData.status);

        return {
          success: status === 'success',
          reference,
          gatewayReference: txData.id?.toString(),
          status,
          amount: txData.amount / 100, // Convert from kobo
          paidAt: txData.paid_at ? new Date(txData.paid_at) : undefined,
          channel: txData.channel,
          currency: txData.currency,
          customer: {
            email: txData.customer?.email,
            phone: txData.customer?.phone,
          },
          rawResponse: data,
        };
      }

      return {
        success: false,
        reference,
        status: 'failed',
        amount: 0,
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        reference,
        status: 'failed',
        amount: 0,
        rawResponse: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  }

  async processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse> {
    try {
      const payload: Record<string, unknown> = {
        transaction: request.gatewayReference,
      };

      if (request.amount) {
        payload.amount = Math.round(request.amount * 100);
      }

      const response = await this.client.post('/refund', payload);
      const data = response.data;

      if (data.status) {
        return {
          success: true,
          reference: data.data?.id?.toString() || '',
          gatewayReference: request.gatewayReference,
          status: 'pending', // Paystack refunds are typically pending initially
          amount: (data.data?.amount || 0) / 100,
          message: data.message,
          rawResponse: data,
        };
      }

      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        message: data.message || 'Refund failed',
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        reference: '',
        status: 'failed',
        amount: 0,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validateWebhookSignature(payload: string, signature: string): boolean {
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');

    return hash === signature;
  }

  parseWebhookEvent(payload: Record<string, unknown>): GatewayWebhookEvent {
    const event = payload.event as string;
    const data = payload.data as Record<string, unknown>;

    return {
      event,
      data: {
        reference: (data.reference as string) || '',
        amount: ((data.amount as number) || 0) / 100, // Convert from kobo
        currency: (data.currency as string) || 'NGN',
        status: data.status as string,
        gatewayReference: (data.id as number)?.toString(),
        paidAt: data.paid_at as string,
        channel: data.channel as string,
        metadata: data.metadata as Record<string, unknown>,
      },
      rawPayload: payload,
    };
  }

  async chargeAuthorization(
    request: GatewayChargeRequest & { authorizationCode: string }
  ): Promise<GatewayChargeResponse> {
    try {
      const response = await this.client.post('/transaction/charge_authorization', {
        email: request.email,
        amount: Math.round(request.amount * 100),
        authorization_code: request.authorizationCode,
        reference: request.reference,
        metadata: request.metadata,
      });

      const data = response.data;

      if (data.status && data.data.status === 'success') {
        return {
          success: true,
          reference: request.reference,
          gatewayReference: data.data.id?.toString(),
          status: 'success',
          rawResponse: data,
        };
      }

      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: data.data?.gateway_response || data.message || 'Charge failed',
        rawResponse: data,
      };
    } catch (error) {
      return {
        success: false,
        reference: request.reference,
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private mapPaystackStatus(status: string): 'success' | 'failed' | 'pending' | 'abandoned' {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'failed';
      case 'abandoned':
        return 'abandoned';
      default:
        return 'pending';
    }
  }
}

/**
 * Create Paystack adapter from environment config
 */
export const createPaystackAdapter = (): PaystackAdapter => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const environment = process.env.PAYSTACK_ENVIRONMENT as 'sandbox' | 'production';

  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY environment variable is required');
  }

  return new PaystackAdapter({
    secretKey,
    environment: environment || 'sandbox',
  });
};
