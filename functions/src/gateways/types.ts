/**
 * Gateway Adapter Types
 * Interface definitions for payment gateway integrations
 */

export interface GatewayChargeRequest {
  amount: number;
  currency: string;
  email: string;
  phone?: string;
  reference: string;
  description?: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
  bankToken?: string;
}

export interface GatewayChargeResponse {
  success: boolean;
  reference: string;
  gatewayReference?: string;
  status: 'pending' | 'success' | 'failed';
  message?: string;
  authorizationUrl?: string;
  accessCode?: string;
  rawResponse?: Record<string, unknown>;
}

export interface GatewayVerifyResponse {
  success: boolean;
  reference: string;
  gatewayReference?: string;
  status: 'success' | 'failed' | 'pending' | 'abandoned';
  amount: number;
  paidAt?: Date;
  channel?: string;
  currency?: string;
  customer?: {
    email?: string;
    phone?: string;
  };
  rawResponse?: Record<string, unknown>;
}

export interface GatewayRefundRequest {
  gatewayReference: string;
  amount?: number;
  reason?: string;
}

export interface GatewayRefundResponse {
  success: boolean;
  reference: string;
  gatewayReference?: string;
  status: 'pending' | 'success' | 'failed';
  amount: number;
  message?: string;
  rawResponse?: Record<string, unknown>;
}

export interface GatewayWebhookEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    gatewayReference?: string;
    paidAt?: string;
    channel?: string;
    metadata?: Record<string, unknown>;
  };
  signature?: string;
  rawPayload: Record<string, unknown>;
}

/**
 * Payment Gateway Adapter Interface
 * All gateway implementations must implement this interface
 */
export interface PaymentGatewayAdapter {
  readonly name: string;
  readonly environment: 'sandbox' | 'production';

  /**
   * Initialize a charge/payment
   */
  initializeCharge(request: GatewayChargeRequest): Promise<GatewayChargeResponse>;

  /**
   * Verify a payment by reference
   */
  verifyPayment(reference: string): Promise<GatewayVerifyResponse>;

  /**
   * Process a refund
   */
  processRefund(request: GatewayRefundRequest): Promise<GatewayRefundResponse>;

  /**
   * Validate webhook signature
   */
  validateWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook event from raw payload
   */
  parseWebhookEvent(payload: Record<string, unknown>): GatewayWebhookEvent;

  /**
   * Charge using saved authorization/token (for auto-debit)
   */
  chargeAuthorization?(
    request: GatewayChargeRequest & { authorizationCode: string }
  ): Promise<GatewayChargeResponse>;
}
