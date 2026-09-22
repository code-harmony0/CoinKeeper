import { isNeverATransaction, parseSmsBody } from '../../src/services/sms/parseSmsBody';

describe('parseSmsBody — real Indian bank SMS shapes', () => {
  describe('debits', () => {
    it('reads an HDFC UPI debit', () => {
      const r = parseSmsBody(
        'Rs.500.00 debited from a/c XX1234 on 12-07-26 to VPA swiggy@okhdfcbank (UPI Ref 412345678901)',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 50000, merchant: 'swiggy' });
    });

    it('reads an ICICI card spend', () => {
      const r = parseSmsBody(
        'Your Card XX9012 has been used for Rs 1,200.00 at AMAZON on 12-07-26.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 120000, merchant: 'AMAZON' });
    });

    it('reads an Axis "spent" alert', () => {
      const r = parseSmsBody('Spent Rs.249 on Card XX1234 at NETFLIX on 03-07-26');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 24900, merchant: 'NETFLIX' });
    });

    it('reads an "amount ... has been debited" alert', () => {
      const r = parseSmsBody(
        'Amount of INR 2,500.00 has been debited from your account for BIGBASKET on 09-07-26',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 250000 });
    });

    it('reads a payment alert', () => {
      const r = parseSmsBody('Payment of Rs 899 to JIO has been made from a/c XX4321.');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 89900, merchant: 'JIO' });
    });
  });

  describe('credits', () => {
    it('reads a salary credit', () => {
      const r = parseSmsBody(
        'Your a/c XX1234 is credited with Rs 50,000.00 on 01-07-26 by ACME PAYROLL',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 5000000 });
    });

    it('reads a UPI money-received alert', () => {
      const r = parseSmsBody('Received Rs.1,500 from RAHUL via UPI on 11-07-26');

      expect(r).toMatchObject({ type: 'credit', amountPaise: 150000, merchant: 'RAHUL' });
    });
  });

  describe('formats found on a real Indian inbox', () => {
    it('reads Federal Bank\'s "sent via UPI" debit', () => {
      const r = parseSmsBody(
        'Rs 3500.00 sent via UPI on 15-06-2026 at 16:02:16 to RAVI KUMAR.Ref:616619231430.' +
          'Not you? Call 18004251199/SMS BLOCKUPI to 9895088888',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 350000, merchant: 'RAVI KUMAR' });
    });

    it('reads an SBI "A/c credited by" transfer', () => {
      const r = parseSmsBody(
        'Dear SBI User, your A/c X0891-credited by Rs.100 on 30May26 transfer from ' +
          'RAVI KUMAR Ref No 209553268645 -SBI',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 10000, merchant: 'RAVI KUMAR' });
    });

    it('reads an HDFC "Credit Alert!" from a VPA', () => {
      const r = parseSmsBody(
        'Credit Alert! Rs.70.00 credited to HDFC Bank A/c XX9720 on 12-08-26 ' +
          'from VPA 8073294117-2@axl (UPI 006446958670)',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 7000 });
    });

    it('takes the charged amount, not the balance, from a low-balance fee alert', () => {
      const r = parseSmsBody(
        'Low Balance Alert! Rs.707.69 +GST charged for low balance in your ' +
          'HDFC Bank A/c X9720. Balance as of AUG-26 Rs.4.52',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 70769 });
    });

    it('does not treat a Jio plan-expiry notice as a transaction', () => {
      expect(
        parseSmsBody('Your recharge plan expired. Plan name: Rs 319_Calendar Month _1.5GB/D'),
      ).toBeNull();
    });
  });

  // Real message shapes from the open-source PennyWise parser's bank test suites
  // that our rules either missed or misread.
  describe('formats from other banks', () => {
    it('reads Kotak\'s "Sent Rs.X from ... to NAME" UPI debit', () => {
      const r = parseSmsBody(
        'Sent Rs.51.00 from XXXXXX9722 to DINESHBHAI RAMJIBHAI on 30/04/2026. UPI ref no. 648604626824. ' +
          'Not you? Tap https://kotk.in/KOTAKD/Eg9Cu0 to report -Kotak',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 5100, merchant: 'DINESHBHAI RAMJIBHAI' });
    });

    it('reads HDFC\'s multi-line "Sent Rs.X From ... To NAME"', () => {
      const r = parseSmsBody('Sent Rs.500.00\nFrom HDFC Bank A/C *1234\nTo SWIGGY\nOn 01/09/26\nRef 567890567890');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 50000, merchant: 'SWIGGY' });
    });

    it('reads an ATM or UPI cash withdrawal', () => {
      const r = parseSmsBody(
        'Rs 1500 withdrawn@ YBL CHAN on 21JAN26 17:59 Bal Rs 7517.94 Ref 602117126490. -Federal Bank',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 150000, merchant: 'YBL CHAN' });
    });

    it('reads a credit-card "txn of ₹X at MERCHANT"', () => {
      const r = parseSmsBody(
        'Your txn of ₹2,351.00 at Amazon on your Scapia Federal Visa credit card earned you 10% rewards! - Federal Bank',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 235100, merchant: 'Amazon' });
    });

    it('reads "debited with Rs" without a named payee', () => {
      const r = parseSmsBody('Your account has been successfully debited with Rs 250.00. Reference: TXN123456789');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 25000 });
    });

    it('reads an SBI debit-card "done at" alert that quotes the balance', () => {
      const r = parseSmsBody(
        'Dear Customer, transaction number 1234 for Rs.383.00 by SBI Debit Card 0000 done at DMART on 13Sep25 ' +
          'at 21:38:26. Your updated available balance is Rs.9999.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 38300, merchant: 'DMART' });
    });

    it('reads SBI card alerts written in stylised Unicode letters', () => {
      const r = parseSmsBody('Rs.90.00 𝗌𝗉𝖾𝗇𝗍 𝗈𝗇 𝗒𝗈𝗎𝗋 𝖲𝖡𝖨 𝖢𝗋𝖾𝖽𝗂𝗍 𝖢𝖺𝗋𝖽 𝖾𝗇𝖽𝗂𝗇𝗀 5667 at SUPREMEGOURMET on 13/02/26.');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 9000, merchant: 'SUPREMEGOURMET' });
    });

    it('reads an HDFC NEFT deposit that quotes the balance', () => {
      const r = parseSmsBody(
        'Update! INR 1,000.00 deposited in HDFC Bank A/c XX9999 on 30-MAR-26 for NEFT Cr-CITI0100000-ACME. Avl bal INR 8.00.',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 100000 });
    });

    it('reads a cashback sent to your account as a credit', () => {
      const r = parseSmsBody('Cashback of Rs.50.00 has been sent to your Kotak Bank A/c x5555. Credited on 14-10-25.');

      expect(r).toMatchObject({ type: 'credit', amountPaise: 5000 });
    });

    it('treats "NAME has received Rs X from your A/c" as money you sent', () => {
      const r = parseSmsBody(
        'Jerry Joseph has received Rs 6000.00 from your A/c XX3343 via NEFT on 24-06-2026 22:04:04. Ref no. FDRLM4175007432',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 600000 });
    });

    it('treats a NEFT "credited to the beneficiary" as money you sent', () => {
      const r = parseSmsBody(
        'ICICI BANK NEFT Transaction with reference number IN12603221231681 for Rs. 22050.00 has been credited to the beneficiary account on 01-02-2026',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 2205000 });
    });

    it.each([
      'Rs. 500.00 will be debited from your account on 05-Oct-25 for EMI payment',
      'AutoPay: Rs 299.00 will be debited on 15-Oct-25 for Spotify subscription',
      'Auto Pay HDFC Bank NACH Mandate : Rs. 100000.00 UMRN:HDFC7031703262015557 To:NationalSecuritiesClearin Freq ADHO received today for processing.',
      'Payment of Rs 26,266.00 has been received on your ICICI Bank Credit Card XX9006 through Bharat Bill Payment System on 06-DEC-25.',
      // Renewal reminders: the library tier read each one as a debit, so one
      // ₹3,003 Wi-Fi payment became seven "payments" in a fortnight.
      'Validity for your Airtel Wi-Fi ID 20027451559 will expire on 18-APR-26 . Recharge with Rs 3003 to enjoy uninterrupted services. To recharge, click https://www.airtel.in/arp/renew-plan?dslId= 083123637445_wifi . Please ignore if already paid.',
      'Expiry Alert: Your Airtel Wi-Fi plan on ID 083123637445_WIFI will expire in 3 days. Renew your plan with Rs. 499 (excluding GST) Advance Rental Plan for 6 months to get flat 15% OFF. To recharge, click i.airtel.in/Recharge-1 \nKindly ignore if already recharged.',
    ])('ignores a future debit, mandate notice, card bill payment or renewal reminder: %s', body => {
      expect(parseSmsBody(body)).toBeNull();
      // Rejected outright, so the permissive library tier cannot import it either.
      expect(isNeverATransaction(body)).toBe(true);
    });
  });

  // Taken verbatim from the user's own inbox (2026-06 → 2026-09), where these
  // were the formats their banks actually send now.
  describe('formats on this user\'s recent messages', () => {
    it('reads SBI\'s UPI debit, which quotes no currency symbol at all', () => {
      const r = parseSmsBody(
        'Dear UPI user A/C X0891 debited by 80.00 on date 09Sep26 trf to JUNAID SHAIKH Refno 661750978258 If not u? call-1800111109',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 8000, merchant: 'JUNAID SHAIKH' });
    });

    it('reads the same shape in credit', () => {
      const r = parseSmsBody(
        'Dear UPI user A/C X0891 credited by 550.00 on date 10Aug26 trf from SAMIRA YASIN Refno 658898287106',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 55000, merchant: 'SAMIRA YASIN' });
    });

    it('reads a fuel receipt paid by cash', () => {
      const r = parseSmsBody(
        'Thank You for Fuelling 05.00 Litres of PETROL Worth Rs.553.60 by CASH in Vehicle at Jio-bp Pump, KRC049 Belgau KR at 00:07 13 Sep 26.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 55360, merchant: 'Jio-bp Pump' });
    });

    it('reads a card-paid fuel receipt as money out, not money in', () => {
      const r = parseSmsBody(
        'Thank You for Fuelling 05.00 Litres of PETROL Worth Rs.553.60 by CREDIT in Vehicle at Jio-bp Pump, KRC049 Belgau KR at 00:07 13 Sep 26.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 55360 });
    });

    it('still ignores a bank notice that quotes no transaction', () => {
      expect(
        parseSmsBody(
          'Your existing Federal Bank-EpiFi co-branded Physical Debit Card will be discontinued after 30 days from the date of our notice.',
        ),
      ).toBeNull();
    });
  });

  // Every one of these imported with no name at all, showing as "Unknown".
  describe('names the transaction, not just the amount', () => {
    it('names a telecom recharge', () => {
      const r = parseSmsBody(
        'Recharge of INR 299.00 is successful for your Airtel Mobile on 19-06-2026 00:46, Transaction ID 1746277175.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 29900, merchant: 'Airtel Mobile' });
    });

    it('names a payment processed for a service', () => {
      const r = parseSmsBody(
        'Hi, we have processed Rs. 299.0 for your Airtel Mobile 8277789670. The payment will be updated within 15 minutes.',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 29900, merchant: 'Airtel Mobile' });
    });

    it('treats a bill collected against your service as money out', () => {
      const r = parseSmsBody(
        "Hi, we've received Rs. 3004 against your Airtel Wi-Fi 083123637445_wifi . Your services will resume within 1 hour.",
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 300400, merchant: 'Airtel Wi-Fi' });
    });

    it('names a bank charge from its "towards" clause', () => {
      const r = parseSmsBody(
        'Dear Customer, Your A/C ending with 0891 has been debited for INR 236.0 on 11-12-25 towards annual maintenance charges for your SBI Debit Card ending 0891',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 23600, merchant: 'annual maintenance charges' });
    });

    it('names a fee from HDFC\'s "For:" clause', () => {
      const r = parseSmsBody(
        'UPDATE: INR 70 debited from HDFC Bank A/c XX769720 on 14-AUG-26. For: DEBIT CARD ANNUAL FEE-Dec-2025-EPR2722639198766',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 7000, merchant: 'DEBIT CARD ANNUAL FEE' });
    });

    it('drops the "Deposit by transfer from" preamble off a payer name', () => {
      const r = parseSmsBody(
        'Your A/C XXXXX190891 Credited INR 57,820.00 on 31/12/25 -Deposit by transfer from AL ANSARI EXCHANGE L. Avl Bal INR 2,05,222.42-SBI',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 5782000, merchant: 'AL ANSARI EXCHANGE L' });
    });

    it('never names a transaction after a stray word from a reference clause', () => {
      const r = parseSmsBody(
        'Hi, Your Prepaid recharge of Rs. 299.0 is success against Order Id 7473453590018334720. Please keep the Order ID for future reference.',
      );

      expect(r?.merchant).not.toBe('erence');
    });
  });

  describe('amounts', () => {
    it('keeps paise exact on amounts that float maths would round badly', () => {
      const r = parseSmsBody('Rs.1250.55 debited from a/c XX1234 to SWIGGY');

      expect(r!.amountPaise).toBe(125055);
    });

    it('handles lakh-scale amounts with multiple separators', () => {
      const r = parseSmsBody('Rs.1,25,000.00 debited from a/c XX1234 to BUILDER');

      expect(r!.amountPaise).toBe(12500000);
    });
  });

  describe('messages that must never become a transaction', () => {
    it('ignores an OTP', () => {
      expect(parseSmsBody('123456 is your OTP for a txn of Rs 500 at AMAZON')).toBeNull();
    });

    it('ignores a declined payment', () => {
      expect(
        parseSmsBody('Payment of Rs 500 to SWIGGY has been declined due to insufficient funds'),
      ).toBeNull();
    });

    it('ignores a failed transaction', () => {
      expect(parseSmsBody('Your payment of Rs 500 to JIO failed.')).toBeNull();
    });

    it('ignores a reversed or refunded transaction alert', () => {
      expect(
        parseSmsBody('Rs 500 debited to SWIGGY has been reversed to your account'),
      ).toBeNull();
    });

    it('still reads a debit that happens to quote the balance afterwards', () => {
      const r = parseSmsBody(
        'Rs.500.00 debited from a/c XX1234 to SWIGGY. Avl Bal Rs 12,000.00',
      );

      expect(r).toMatchObject({ type: 'debit', amountPaise: 50000 });
    });

    it('still reads a credit that quotes the available balance', () => {
      const r = parseSmsBody(
        'Your a/c XX1234 is credited with Rs 50,000.00 by ACME PAYROLL. Available balance Rs 60,000',
      );

      expect(r).toMatchObject({ type: 'credit', amountPaise: 5000000 });
    });

    it('ignores a balance enquiry', () => {
      expect(parseSmsBody('Your a/c XX1234 balance is Rs 12,345.67 as on 12-07-26')).toBeNull();
    });

    it('ignores a request-for-payment message', () => {
      expect(
        parseSmsBody('RAHUL has requested Rs 500. Pay using your UPI app.'),
      ).toBeNull();
    });

    it('ignores a promotional message', () => {
      expect(parseSmsBody('Get a loan of Rs 5,00,000 credited instantly! T&C apply')).toBeNull();
    });

    it('ignores a message with no amount at all', () => {
      expect(parseSmsBody('Your statement is ready to view.')).toBeNull();
    });
  });

  describe('merchant cleanup', () => {
    it('strips a UPI VPA down to its handle', () => {
      const r = parseSmsBody('Rs.200 debited from a/c XX1 to VPA zomato@ybl (UPI Ref 9988776655)');

      expect(r!.merchant).toBe('zomato');
    });

    it('drops a trailing date', () => {
      const r = parseSmsBody('Rs.200 debited from a/c XX1 to STARBUCKS on 12-07-26');

      expect(r!.merchant).toBe('STARBUCKS');
    });

    it('drops a trailing reference number', () => {
      const r = parseSmsBody('Rs.200 debited from a/c XX1 to UBER Ref 123456789012');

      expect(r!.merchant).toBe('UBER');
    });

    it('leaves the merchant empty rather than guessing when none is present', () => {
      const r = parseSmsBody('Rs.200 debited from a/c XX1234 on 12-07-26');

      expect(r).toMatchObject({ type: 'debit', amountPaise: 20000, merchant: '' });
    });
  });
});
