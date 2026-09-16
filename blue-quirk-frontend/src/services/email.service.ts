// Admin email operations. The custom-email endpoint lets an admin send a one-off
// message (free subject + body) to a customer via the store's Resend sender, with
// Reply-To set server-side to the monitored admin inbox so replies reach a human.
import api from "./api";

export type CustomEmailPayload = {
  to: string;
  subject: string;
  body: string;
  /** Optional order context (for server-side logging). */
  orderId?: number;
};

export const EmailService = {
  /** Send a custom subject/body email to a customer. Admin-only endpoint. */
  sendCustom: async (payload: CustomEmailPayload): Promise<void> => {
    await api.post("/email/custom", payload);
  },
};
