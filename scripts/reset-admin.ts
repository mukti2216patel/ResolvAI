import { db } from "../src/db";

async function resetAdmin() {
    const email = "admin@example.com";
    console.log(`🗑️  Deleting user ${email}...`);
    
    try {
        const user = await db.user.findUnique({ where: { email } });
        if (user) {
            // Delete associated records first (though Cascade is set in schema)
            await db.session.deleteMany({ where: { userId: user.id } });
            await db.account.deleteMany({ where: { userId: user.id } });
            await db.user.delete({ where: { id: user.id } });
            console.log("✅ User deleted.");
        } else {
            console.log("ℹ️  User not found.");
        }
    } catch (error) {
        console.error("❌ Error deleting user:", error);
        process.exit(1);
    }
}

resetAdmin().then(() => process.exit(0));
