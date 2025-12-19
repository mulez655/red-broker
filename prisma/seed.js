import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL || "admin@redvault.local").toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || "Admin12345!";
  const name = process.env.ADMIN_SEED_NAME || "RedVault Admin";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log("Admin already exists:", email);
    return;
  }

  const hashed = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      role: "ADMIN",
      status: "ACTIVE",
      plan: "Platinum",
      balance: 2500.0
    }
  });

  console.log("Seeded admin:", email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
