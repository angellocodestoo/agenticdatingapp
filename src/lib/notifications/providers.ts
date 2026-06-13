export type NotificationChannel = "email" | "sms" | "push";

export type OutboundNotification = {
  channel: NotificationChannel;
  to: string;
  subject?: string;
  body: string;
  href?: string;
};

export type NotificationProviderResult = {
  provider: string;
  delivered: boolean;
  mock: boolean;
  messageId?: string;
};

export interface NotificationProvider {
  name: string;
  send(notification: OutboundNotification): Promise<NotificationProviderResult>;
}

class MockNotificationProvider implements NotificationProvider {
  name = "mock";

  async send(): Promise<NotificationProviderResult> {
    return {
      provider: this.name,
      delivered: true,
      mock: true,
      messageId: `mock_${Date.now()}`,
    };
  }
}

export function getNotificationProvider(): NotificationProvider {
  return new MockNotificationProvider();
}

export function getNotificationProviderStatus() {
  return {
    email: process.env.RESEND_API_KEY ? "configured" : "mock",
    sms:
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER
        ? "configured"
        : "mock",
    push: process.env.PUSH_PROVIDER && process.env.PUSH_API_KEY ? "configured" : "mock",
  };
}
