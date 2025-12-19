import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { z } from "zod";

const prisma = new PrismaClient();
const router = express.Router();

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.sub },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      plan: true,
      balance: true
    }
  });

  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user });
});

// ✅ Choose plan AFTER signup
router.patch("/plan", requireAuth, async (req, res) => {
  const schema = z.object({
    plan: z.enum(["Basic", "Silver", "Gold", "Platinum"])
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data: { plan: parsed.data.plan },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      balance: true
    }
  });

  res.json({ user });
});

// ✅ Deposit simulation AFTER choosing plan
router.post("/deposit", requireAuth, async (req, res) => {
  const schema = z.object({
    amount: z.number().positive().max(1000000)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid deposit amount" });
  }

  const amount = parsed.data.amount;

  const user = await prisma.user.update({
    where: { id: req.user.sub },
    data: { balance: { increment: amount } },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      balance: true
    }
  });

  res.json({ user });
});


router.get("/transactions", requireAuth, async (req, res) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.user.sub },
      orderBy: { createdAt: "desc" }
    });

    res.json({ transactions });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});


router.post("/deposit-request", requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: "Invalid amount" });
    }

    // create a PENDING deposit transaction (do NOT change balance)
    const tx = await prisma.transaction.create({
      data: {
        userId: req.user.sub,
        type: "DEPOSIT",
        amount,
        status: "PENDING",
        note: "User submitted deposit request"
      }
    });

    res.json({ transaction: tx });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to create deposit request" });
  }
});


export default router;
