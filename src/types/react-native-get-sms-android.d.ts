declare module 'react-native-get-sms-android' {
  export interface SmsMessage {
    _id: string;
    address: string;
    body: string;
    date: number;
    date_sent: number;
    read: number;
    status: number;
    type: number;
  }

  export interface SmsFilter {
    box?: string;
    minDate?: number;
    maxDate?: number;
    bodyRegex?: string;
    read?: number;
    indexFrom?: number;
    maxCount?: number;
  }

  const SmsAndroid: {
    list(
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ): void;
    delete(id: string, fail: (error: string) => void, success: () => void): void;
    autoSend(
      phoneNumber: string,
      message: string,
      fail: (error: string) => void,
      success: () => void
    ): void;
  };

  export default SmsAndroid;
}
