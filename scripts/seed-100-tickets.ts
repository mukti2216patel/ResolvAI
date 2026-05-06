import { db } from '../src/db.js';
import { TicketStatus, TicketPriority, TicketCategory } from '../src/types/index.js';

const subjects = [
  "Cannot login to my account",
  "How do I reset my password?",
  "Refund for recent charge",
  "App keeps crashing on startup",
  "Feature request: Dark mode",
  "Billing discrepancy",
  "Where is my receipt?",
  "Integration with Slack not working",
  "Technical issue with dashboard",
  "Question about pricing plans",
  "Upgrade my subscription",
  "Cancel my account",
  "Is there an API available?",
  "Bug in the latest update",
  "Help with onboarding",
  "Lost my 2FA backup codes",
  "Need invoice for accounting",
  "Performance is very slow today",
  "Can I change my email address?",
  "Data export request",
  "Account locked out",
  "Payment method declined",
  "SSO integration help",
  "Delete my workspace",
  "Invite teammate failed"
];

const descriptions = [
  "I'm experiencing this issue since yesterday. Please help.",
  "I need assistance as soon as possible. This is blocking my work.",
  "Just a quick question regarding this feature.",
  "I've tried restarting but it still doesn't work.",
  "Could you please look into this? It seems like a bug.",
  "I was charged twice for the same subscription period.",
  "I love the product, but this would make it even better.",
  "The documentation is unclear about this part.",
  "It was working fine until the last update.",
  "I need this resolved before the end of the billing cycle.",
  "Can you jump on a call to help me debug this?",
  "Error code: 500 Internal Server Error when clicking save.",
  "I accidentally clicked the wrong button, can you revert it?",
  "I'm a premium user and expect this to be handled quickly."
];

const statuses = ['open', 'in_progress', 'resolved', 'closed'];
const priorities = ['low', 'medium', 'high', 'critical'];
const customerEmails = [
  "customer.alice@gmail.com",
  "customer.bob@yahoo.com",
  "customer.charlie@outlook.com",
  "customer.david@protonmail.com",
  "customer.emma@live.com",
  "customer.frank@icloud.com",
  "customer.grace@gmail.com",
  "customer.henry@yahoo.com",
  "customer.isabella@outlook.com",
  "customer.jack@gmail.com"
];

function randomElement(arr: any[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedTickets() {
  console.log('Fetching user...');
  let user = await db.user.findFirst({
    where: { email: 'admin@example.com' }
  });
  
  if (!user) {
     user = await db.user.findFirst();
  }

  if (!user) {
    console.error('No users found. Please create a user or run the main seeder first.');
    process.exit(1);
  }

  console.log(`Creating 100 diverse tickets for user ${user.id}...`);

  for (let i = 0; i < 100; i++) {
    const subjectBase = randomElement(subjects);
    const desc = randomElement(descriptions);
    const status = randomElement(statuses);
    const priority = randomElement(priorities);
    const customerEmail = randomElement(customerEmails);
    let category = 'general_question';
    
    // Make category somewhat match the subject
    const lowerSub = subjectBase.toLowerCase();
    if (lowerSub.includes('refund') || lowerSub.includes('billing') || lowerSub.includes('charge') || lowerSub.includes('invoice') || lowerSub.includes('pricing') || lowerSub.includes('payment')) {
       category = 'refund_request';
    } else if (lowerSub.includes('crash') || lowerSub.includes('bug') || lowerSub.includes('api') || lowerSub.includes('integration') || lowerSub.includes('error')) {
       category = 'technical_question';
    }

    const title = `${subjectBase} (Ticket #${i + 1})`;
    
    // Spread createdAt over the last 30 days
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const createdAt = new Date();
    createdAt.setDate(createdAt.getDate() - daysAgo);
    createdAt.setHours(createdAt.getHours() - hoursAgo);

    const updatedAt = new Date(createdAt);
    if (status !== 'open') {
        updatedAt.setHours(updatedAt.getHours() + Math.floor(Math.random() * 48));
    }

    await db.ticket.create({
      data: {
        title,
        description: desc,
        status: status as any,
        priority: priority as any,
        category: category as any,
        userId: user.id,
        customerEmail,
        createdAt,
        updatedAt
      }
    });
  }

  console.log('✅ 100 diverse tickets created successfully!');
}

seedTickets().catch(e => {
  console.error(e);
  process.exit(1);
});
