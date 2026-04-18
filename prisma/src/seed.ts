import { auth } from "../../src/auth";
import { db } from "../../src/db";
import { UserRole } from "../../src/types";

async function seed() {
    const email = process.env.SEED_ADMIN_EMAIL;
    const password = process.env.SEED_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error(
            "❌ Missing SEED_ADMIN_EMAIL or SEED_ADMIN_PASSWORD environment variables."
        );
        process.exit(1);
    }

    console.log("🌱 Seeding database...\n");

    // Check if admin user already exists
    const existingUser = await db.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log(`⚠️  User with email "${email}" already exists. Skipping.\n`);
    } else {
        // Use the admin plugin's createUser API to create the user.
        // This bypasses the disableSignUp restriction and properly
        // handles password hashing and account record creation.
        const result = await auth.api.createUser({
            body: {
                email,
                password,
                name: "Admin",
                role: UserRole.ADMIN,
            },
        });

        if (!result?.user) {
            console.error("❌ Failed to create admin user.");
            process.exit(1);
        }

        console.log(`✅ Admin user created:`);
        console.log(`   Email: ${email}`);
        console.log(`   Role:  ${UserRole.ADMIN}\n`);
    }

    // Seed the AI Agent user
    const aiEmail = "ai@example.com";
    const existingAi = await db.user.findUnique({
        where: { email: aiEmail },
    });

    if (existingAi) {
        console.log(`⚠️  AI Agent with email "${aiEmail}" already exists. Skipping.\n`);
    } else {
        const result = await auth.api.createUser({
            body: {
                email: aiEmail,
                password: "aipassword123",
                name: "AI",
                role: UserRole.AGENT,
            },
        });

        if (!result?.user) {
            console.error("❌ Failed to create AI agent user.");
            process.exit(1);
        }

        console.log(`✅ AI agent user created:`);
        console.log(`   Email: ${aiEmail}`);
        console.log(`   Role:  ${UserRole.AGENT}\n`);
    }

    console.log("🌱 Seeding complete!");
    process.exit(0);
}

seed().catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
});
