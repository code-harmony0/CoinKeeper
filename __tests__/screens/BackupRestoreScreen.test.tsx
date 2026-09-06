import React from 'react';
import { Alert } from 'react-native';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockCreateAndShare = jest.fn(async (_passphrase?: string) => undefined);
const mockReadBackup = jest.fn(async (_path: string, _passphrase?: string) => ({
  meta: { format_version: 1, schema_user_version: 16, created_at: 1 },
  rows: { transactions: [{ id: 't1' }, { id: 't2' }], goals: [{ id: 'g1' }] },
}));
const mockRestoreBackup = jest.fn(async (_rows: unknown, _mode: string) => undefined);
const mockPick = jest.fn(async () => [{ uri: '/tmp/b.ckbackup', name: 'b.ckbackup' }]);

class mockEncryptedError extends Error {}
class mockTooNewError extends Error {}

jest.mock('../../src/services/backup', () => ({
  createAndShareBackup: (passphrase?: string) => mockCreateAndShare(passphrase),
  readBackup: (path: string, passphrase?: string) => mockReadBackup(path, passphrase),
  restoreBackup: (rows: unknown, mode: string) => mockRestoreBackup(rows, mode),
  // Getters: the hoisted `import` below runs this factory while the class
  // declarations are still in their temporal dead zone, so resolve on access.
  get BackupEncryptedError() {
    return mockEncryptedError;
  },
  get BackupTooNewError() {
    return mockTooNewError;
  },
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: () => mockPick(),
  types: { allFiles: '*/*' },
}));

import { BackupRestoreScreen } from '../../src/screens/user/BackupRestoreScreen';

const navigation = { goBack: jest.fn() } as any;

describe('BackupRestoreScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('backs up without a passphrase by default', async () => {
    const { getByText } = render(<BackupRestoreScreen navigation={navigation} />);

    fireEvent.press(getByText('Back up now'));

    await waitFor(() => expect(mockCreateAndShare).toHaveBeenCalledWith(undefined));
  });

  it('warns that a forgotten passphrase cannot be recovered', () => {
    const { getByText, getByLabelText } = render(
      <BackupRestoreScreen navigation={navigation} />,
    );

    fireEvent(getByLabelText('Protect with a passphrase'), 'valueChange', true);

    expect(getByText(/cannot be recovered/i)).toBeTruthy();
  });

  it('refuses to back up when the two passphrases differ', async () => {
    const { getByText, getByLabelText, getByPlaceholderText } = render(
      <BackupRestoreScreen navigation={navigation} />,
    );

    fireEvent(getByLabelText('Protect with a passphrase'), 'valueChange', true);
    fireEvent.changeText(getByPlaceholderText('Passphrase'), 'hunter2');
    fireEvent.changeText(getByPlaceholderText('Confirm passphrase'), 'hunterTWO');
    fireEvent.press(getByText('Back up now'));

    await waitFor(() => expect(getByText(/do not match/i)).toBeTruthy());
    expect(mockCreateAndShare).not.toHaveBeenCalled();
  });

  it('passes a confirmed passphrase through to the backup', async () => {
    const { getByText, getByLabelText, getByPlaceholderText } = render(
      <BackupRestoreScreen navigation={navigation} />,
    );

    fireEvent(getByLabelText('Protect with a passphrase'), 'valueChange', true);
    fireEvent.changeText(getByPlaceholderText('Passphrase'), 'hunter2');
    fireEvent.changeText(getByPlaceholderText('Confirm passphrase'), 'hunter2');
    fireEvent.press(getByText('Back up now'));

    await waitFor(() => expect(mockCreateAndShare).toHaveBeenCalledWith('hunter2'));
  });

  it('shows what a restore will apply before applying it', async () => {
    const { getByText, queryByText } = render(
      <BackupRestoreScreen navigation={navigation} />,
    );

    fireEvent.press(getByText('Restore from a file'));

    // The row counts must be visible, and nothing restored yet.
    await waitFor(() => expect(getByText(/3 rows|2 transactions/i)).toBeTruthy());
    expect(mockRestoreBackup).not.toHaveBeenCalled();
    expect(queryByText('Replace everything')).toBeTruthy();
  });

  it('asks for a passphrase when the chosen file is encrypted', async () => {
    mockReadBackup.mockRejectedValueOnce(new mockEncryptedError('protected'));

    const { getByText, getByPlaceholderText } = render(
      <BackupRestoreScreen navigation={navigation} />,
    );

    fireEvent.press(getByText('Restore from a file'));

    await waitFor(() =>
      expect(getByPlaceholderText('Backup passphrase')).toBeTruthy(),
    );
    expect(mockRestoreBackup).not.toHaveBeenCalled();
  });

  it('restores in merge mode without destroying existing data', async () => {
    const { getByText } = render(<BackupRestoreScreen navigation={navigation} />);

    fireEvent.press(getByText('Restore from a file'));
    await waitFor(() => getByText('Merge with my data'));
    fireEvent.press(getByText('Merge with my data'));

    await waitFor(() =>
      expect(mockRestoreBackup).toHaveBeenCalledWith(expect.anything(), 'merge'),
    );
  });

  it('requires an extra confirmation before replacing everything', async () => {
    const { getByText } = render(<BackupRestoreScreen navigation={navigation} />);

    fireEvent.press(getByText('Restore from a file'));
    await waitFor(() => getByText('Replace everything'));
    fireEvent.press(getByText('Replace everything'));

    // Replace is destructive: it must go through a confirm step, not fire at once.
    expect(mockRestoreBackup).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
