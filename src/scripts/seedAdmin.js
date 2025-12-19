import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL || "").toLowerCase().trim();
  const password = process.env.ADMIN_SEED_PASSWORD || "";

  if (!email || !password) {
    console.log("Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD in .env");
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  const hashed = await bcrypt.hash(password, 10);

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        role: "ADMIN",
        password: hashed,
        status: "ACTIVE"
      }
    });

    console.log("Admin updated:", email);
  } else {
    await prisma.user.create({
      data: {
        name: "Admin",
        email,
        password: hashed,
        role: "ADMIN",
        status: "ACTIVE",
        plan: "Basic",
        balance: 0
      }
    });

    console.log("Admin created:", email);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
