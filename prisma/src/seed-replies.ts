import { db } from "../../src/db";
import { ReplySenderType } from "../../src/lib/prisma/client";

async function main() {
  console.log("🌱 Seeding Ticket 9 replies...");

  // Find user (preferably agent or admin) for authoring agent replies
  let agentUser = await db.user.findFirst({
    where: { role: 'agent' }
  });
  if (!agentUser) {
    agentUser = await db.user.findFirst();
  }
  if (!agentUser) {
    throw new Error("No user found in the database to author agent replies.");
  }

  // Find or create ticket 9
  let ticket = await db.ticket.findUnique({
    where: { ticketNumber: 9 }
  });

  if (!ticket) {
    console.log("Ticket 9 does not exist. Creating it...");
    ticket = await db.ticket.create({
      data: {
        ticketNumber: 9,
        title: "Simulation of Long Conversation",
        description: "This ticket simulates a long multi-turn support query for testing UI scroll, pagination, and load times.",
        customerEmail: "customer.experience@example.com",
        status: "open",
        priority: "medium",
        category: "general_question"
      }
    });
    console.log(`Created Ticket 9: ID=${ticket.id}`);
  } else {
    console.log(`Found Ticket 9: ID=${ticket.id}`);
  }

  // Delete existing replies for ticket 9
  await db.ticketReply.deleteMany({
    where: { ticketId: ticket.id }
  });
  console.log("Deleted existing replies for ticket 9.");

  // Generate 20 replies
  const totalReplies = 20;

  for (let i = 1; i <= totalReplies; i++) {
    const isAgent = i % 2 !== 0; // Odd replies are agent, Even replies are customer
    const senderType = isAgent ? ReplySenderType.agent : ReplySenderType.customer;

    // Build at least 10 lines of content
    const lines: string[] = [];
    lines.push(`=== Conversation Turn #${i} ===`);
    lines.push(`This is response number ${i} in our long support simulation.`);
    lines.push(`We are establishing a realistic conversation history to test layout capability.`);
    
    if (isAgent) {
      lines.push(`Thank you for contacting support. I am Agent ${agentUser.name}.`);
      lines.push(`I have reviewed the details you provided regarding turn #${i - 1 || 'initial request'}.`);
      lines.push(`To troubleshoot this efficiently, let's look at the logs or environment variables.`);
      lines.push(`Sometimes network issues or database locks cause transient errors like these.`);
      lines.push(`Here are the steps we recommend you perform now:`);
      lines.push(`1. Verify the connection string in your configuration.`);
      lines.push(`2. Check the memory utilization on the host server.`);
      lines.push(`Sincerely,`);
      lines.push(`${agentUser.name}`);
    } else {
      lines.push(`Hello Support Team, this is the customer replying back.`);
      lines.push(`I appreciate the quick response on turn #${i}.`);
      lines.push(`I have gone through the steps you outlined in your message.`);
      lines.push(`Here is the status of each item I checked:`);
      lines.push(`- Connection string: Verified, it matches the production credentials.`);
      lines.push(`- Server memory: Currently at 45%, which is well within limits.`);
      lines.push(`However, I am still seeing sporadic failures during high traffic periods.`);
      lines.push(`Thanks for your help, and let me know the next steps.`);
      lines.push(`Best regards,`);
      lines.push(`Customer Experience Team`);
    }

    // Ensure it is strictly at least 10 lines
    while (lines.length < 10) {
      lines.push(`Filler Line #${lines.length + 1} to meet the 10 lines minimum requirement.`);
    }

    const content = lines.join('\n');

    await db.ticketReply.create({
      data: {
        content,
        ticketId: ticket.id,
        senderType,
        userId: isAgent ? agentUser.id : null,
        customerEmail: isAgent ? null : ticket.customerEmail,
        customerName: isAgent ? null : "Customer Jack",
        createdAt: new Date(Date.now() - (totalReplies - i) * 60000) // Incremental timestamps
      }
    });
  }

  console.log(`🌱 Seeding complete! Created 20 replies for ticket 9.`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
    process.exit(0);
  });
