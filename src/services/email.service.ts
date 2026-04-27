import { resend } from "../lib/resend";

const FROM_EMAIL = "onboarding@resend.dev";

export const emailService = {
  async sendTicketCreated(to: string, ticketNumber: number, title: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Ticket #${ticketNumber} Created - ${title}`,
      html: `
        <h2>Your ticket has been received</h2>
        <p>Ticket #${ticketNumber}: <strong>${title}</strong></p>
        <p>Our team will get back to you soon.</p>
      `,
    });
  },

  async sendTicketReply(to: string, ticketNumber: number, message: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Re: Ticket #${ticketNumber}`,
      html: `
        <h2>New reply on your ticket #${ticketNumber}</h2>
        <p>${message}</p>
      `,
    });
  },

  async sendTicketStatusUpdate(to: string, ticketNumber: number, status: string) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Ticket #${ticketNumber} Status Updated`,
      html: `
        <h2>Your ticket status has changed</h2>
        <p>Ticket #${ticketNumber} is now <strong>${status}</strong></p>
      `,
    });
  },
};
