import { resolveBank, UNKNOWN_BANK } from '../../src/services/sms/bankRegistry';

describe('resolveBank', () => {
  describe('Indian sender-ID shapes', () => {
    it('reads the bank code out of a two-part sender', () => {
      expect(resolveBank('JX-HDFCBK')).toMatchObject({ id: 'HDFC', name: 'HDFC Bank' });
    });

    it('reads the bank code out of a three-part sender', () => {
      expect(resolveBank('AD-FEDBNK-S')).toMatchObject({ id: 'FEDERAL', name: 'Federal Bank' });
    });

    it('ignores the rotating two-letter prefix entirely', () => {
      // The same bank reaches the phone under many prefixes; they are routing
      // artefacts, not different institutions.
      const senders = ['VM-HDFCBK-S', 'JM-HDFCBK', 'AD-HDFCBK-S', 'AX-HDFCBK', 'CP-HDFCBK'];
      const ids = senders.map(s => resolveBank(s).id);

      expect(new Set(ids).size).toBe(1);
      expect(ids[0]).toBe('HDFC');
    });
  });

  describe('one bank, many codes', () => {
    it('groups Federal Bank\'s two codes together', () => {
      expect(resolveBank('AD-FEDBNK-S').id).toBe('FEDERAL');
      expect(resolveBank('AD-FedFiB-S').id).toBe('FEDERAL');
    });

    it('groups every SBI channel under one bank', () => {
      const ids = ['JK-SBIUPI-S', 'JD-CBSSBI-S', 'JK-ATMSBI-S', 'VK-SBIBNK-S'].map(
        s => resolveBank(s).id,
      );

      expect(new Set(ids)).toEqual(new Set(['SBI']));
    });

    it('groups Airtel\'s channels together', () => {
      const ids = ['AD-AIRTEL-S', 'AX-AIRINF', 'AD-AIRBIL-S'].map(s => resolveBank(s).id);

      expect(new Set(ids).size).toBe(1);
    });
  });

  describe('unknown senders', () => {
    it('keeps an unrecognised code as its own group rather than discarding it', () => {
      const bank = resolveBank('JD-RPUMPS-S');

      expect(bank.id).toBe('RPUMPS');
      expect(bank.known).toBe(false);
    });

    it('falls back for a sender with no recognisable code', () => {
      expect(resolveBank('')).toMatchObject({ id: UNKNOWN_BANK });
    });

    it('handles a plain numeric sender', () => {
      expect(resolveBank('+919876543210').known).toBe(false);
    });
  });

  describe('case handling', () => {
    it('matches regardless of case', () => {
      expect(resolveBank('ax-fedfib-s').id).toBe('FEDERAL');
      expect(resolveBank('AX-FEDFIB-S').id).toBe('FEDERAL');
    });
  });

  it('covers the other major Indian banks', () => {
    expect(resolveBank('VM-ICICIB-S').id).toBe('ICICI');
    expect(resolveBank('AD-AXISBK-S').id).toBe('AXIS');
    expect(resolveBank('JD-KOTAKB').id).toBe('KOTAK');
    expect(resolveBank('VK-PYTMBK-S').id).toBe('PAYTM');
  });
});
