/**
 * receiptService.ts
 * Generate PDF receipts for contributions and share via WhatsApp
 */

import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import { Contribution } from '../types/transaction';

/**
 * Generate HTML template for receipt
 */
const generateReceiptHTML = (contribution: Contribution, receiptNumber: string): string => {
  const formattedDate = contribution.paidAt
    ? new Date(contribution.paidAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/A';

  const formattedAmount = `₦${contribution.amount.toLocaleString()}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Receipt</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 40px;
          background: #ffffff;
          color: #121723;
        }

        .receipt {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #E2E8F0;
          border-radius: 16px;
          overflow: hidden;
        }

        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 32px;
          text-align: center;
          color: #ffffff;
        }

        .header h1 {
          font-size: 32px;
          font-weight: 800;
          margin-bottom: 8px;
          letter-spacing: -0.5px;
        }

        .header p {
          font-size: 16px;
          opacity: 0.9;
        }

        .content {
          padding: 32px;
        }

        .receipt-number {
          text-align: center;
          padding: 16px;
          background: #F8FAFC;
          border-radius: 12px;
          margin-bottom: 32px;
        }

        .receipt-number p {
          font-size: 14px;
          color: #64748B;
          margin-bottom: 4px;
        }

        .receipt-number h3 {
          font-size: 20px;
          font-weight: 700;
          color: #121723;
        }

        .info-section {
          margin-bottom: 24px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid #E2E8F0;
        }

        .info-row:last-child {
          border-bottom: none;
        }

        .info-label {
          font-size: 14px;
          color: #64748B;
          font-weight: 500;
        }

        .info-value {
          font-size: 16px;
          color: #121723;
          font-weight: 600;
          text-align: right;
        }

        .amount-section {
          background: #F0FDF4;
          border: 2px solid #10B981;
          border-radius: 12px;
          padding: 24px;
          margin: 32px 0;
          text-align: center;
        }

        .amount-label {
          font-size: 14px;
          color: #047857;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 8px;
        }

        .amount-value {
          font-size: 36px;
          font-weight: 800;
          color: #10B981;
        }

        .status-badge {
          display: inline-block;
          padding: 8px 16px;
          background: #10B981;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          border-radius: 24px;
          letter-spacing: 0.5px;
        }

        .footer {
          padding: 24px 32px;
          background: #F8FAFC;
          text-align: center;
          border-top: 2px solid #E2E8F0;
        }

        .footer p {
          font-size: 12px;
          color: #64748B;
          line-height: 1.6;
        }

        .footer strong {
          color: #121723;
        }

        .divider {
          height: 2px;
          background: linear-gradient(to right, transparent, #E2E8F0, transparent);
          margin: 24px 0;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <h1>CoinKeeper</h1>
          <p>Payment Receipt</p>
        </div>

        <div class="content">
          <div class="receipt-number">
            <p>Receipt Number</p>
            <h3>${receiptNumber}</h3>
          </div>

          <div class="info-section">
            <div class="info-row">
              <span class="info-label">Member Name</span>
              <span class="info-value">${contribution.userName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Group Name</span>
              <span class="info-value">${contribution.groupName || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Date</span>
              <span class="info-value">${formattedDate}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Payment Method</span>
              <span class="info-value">${contribution.paymentMethod || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Transaction ID</span>
              <span class="info-value">${contribution.transactionId || 'N/A'}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Status</span>
              <span class="info-value">
                <span class="status-badge">${contribution.status.toUpperCase()}</span>
              </span>
            </div>
          </div>

          <div class="divider"></div>

          <div class="amount-section">
            <div class="amount-label">Amount Paid</div>
            <div class="amount-value">${formattedAmount}</div>
          </div>

          ${contribution.notes ? `
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Notes</span>
                <span class="info-value">${contribution.notes}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>
            <strong>Thank you for your contribution!</strong><br>
            This is an auto-generated receipt from CoinKeeper.<br>
            For any inquiries, please contact your group administrator.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate receipt number
 */
const generateReceiptNumber = (contributionId: string): string => {
  const timestamp = Date.now().toString().slice(-8);
  const shortId = contributionId.slice(0, 6).toUpperCase();
  return `RCP-${shortId}-${timestamp}`;
};

/**
 * Generate PDF receipt for contribution
 */
export const generateReceipt = async (contribution: Contribution): Promise<string> => {
  try {
    const receiptNumber = generateReceiptNumber(contribution.id);
    const html = generateReceiptHTML(contribution, receiptNumber);

    const options = {
      html,
      fileName: `receipt_${receiptNumber}`,
      directory: 'Documents',
      base64: false,
    };

    const file = await RNHTMLtoPDF.convert(options);
    return file.filePath || '';
  } catch (error) {
    console.error('Error generating receipt:', error);
    throw new Error('Failed to generate receipt');
  }
};

/**
 * Share receipt via WhatsApp
 */
export const shareReceiptWhatsApp = async (
  filePath: string,
  phoneNumber?: string
): Promise<void> => {
  try {
    const shareOptions: any = {
      title: 'Payment Receipt',
      message: 'Here is your payment receipt from CoinKeeper',
      url: `file://${filePath}`,
      type: 'application/pdf',
      social: Share.Social.WHATSAPP,
    };

    // If phone number provided, add it
    if (phoneNumber) {
      shareOptions.whatsAppNumber = phoneNumber;
    }

    await Share.shareSingle(shareOptions);
  } catch (error) {
    console.error('Error sharing receipt via WhatsApp:', error);
    throw new Error('Failed to share receipt');
  }
};

/**
 * Share receipt via generic share
 */
export const shareReceipt = async (filePath: string): Promise<void> => {
  try {
    const shareOptions = {
      title: 'Payment Receipt',
      message: 'Here is your payment receipt from CoinKeeper',
      url: `file://${filePath}`,
      type: 'application/pdf',
    };

    await Share.open(shareOptions);
  } catch (error) {
    console.error('Error sharing receipt:', error);
    throw new Error('Failed to share receipt');
  }
};

/**
 * Generate and share receipt (convenience function)
 */
export const generateAndShareReceipt = async (
  contribution: Contribution,
  shareMethod: 'whatsapp' | 'general' = 'general',
  phoneNumber?: string
): Promise<void> => {
  try {
    // Generate PDF
    const filePath = await generateReceipt(contribution);

    // Share based on method
    if (shareMethod === 'whatsapp') {
      await shareReceiptWhatsApp(filePath, phoneNumber);
    } else {
      await shareReceipt(filePath);
    }
  } catch (error) {
    console.error('Error in generateAndShareReceipt:', error);
    throw error;
  }
};

/**
 * Batch generate receipts
 */
export const batchGenerateReceipts = async (
  contributions: Contribution[]
): Promise<{ success: number; failed: number; filePaths: string[] }> => {
  const filePaths: string[] = [];
  let success = 0;
  let failed = 0;

  for (const contribution of contributions) {
    try {
      const filePath = await generateReceipt(contribution);
      filePaths.push(filePath);
      success++;
    } catch (error) {
      console.error(`Failed to generate receipt for ${contribution.id}:`, error);
      failed++;
    }
  }

  return { success, failed, filePaths };
};
