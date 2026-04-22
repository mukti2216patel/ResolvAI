import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin } from "better-auth/plugins";
import { APIError } from "better-auth/api";
import { db } from "./db";
import { UserRole } from "./types";

// Custom plugin to handle soft-deleted users
const softDeletePlugin = {
    id: "soft-delete",
    hooks: {
        before: [
            {
                matcher: (ctx: any) => ctx.path.startsWith("/sign-in/email"),
                handler: async (ctx: any) => {
                    const email = ctx.data?.email || ctx.body?.email;
                    if (!email) return;

                    const user = await db.user.findUnique({
                        where: { email: email.toLowerCase() }
                    });
                    if (user?.deletedAt) {
                        throw new APIError("UNAUTHORIZED", {
                            message: "Your account has been deleted.",
                        });
                    }
                },
            },
        ],
    },
};

export const auth = betterAuth({
    database: prismaAdapter(db, {
        provider: "postgresql",
    }),
    emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    },
    trustedOrigins: [
        process.env.CLIENT_URL || process.env.TRUSTED_ORIGINS || "http://localhost:5173"
    ],
    plugins: [
        admin({
            defaultRole: UserRole.AGENT,
        }),
        softDeletePlugin,
    ],
});
