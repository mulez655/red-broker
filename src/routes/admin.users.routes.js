import express from "express";
import { PrismaClient } from "@prisma/client";
import { requireAuth, requireAdmin } from "../middleware/auth.js";

const prisma = new PrismaClient();
const router = express.Router();

/* ===========================
   GET ALL USERS
=========================== */
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
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

    res.json({ users });
  } catch (e) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

/* ===========================
   UPDATE USER (BALANCE / PLAN / STATUS)
=========================== */
router.patch("/users/:id", requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { balance, plan, status } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return res.status(404).json({ error: "User not found" });

    // balance change → transaction
    if (balance !== undefined && balance !== user.balance) {
      const delta = balance - user.balance;

      await prisma.transaction.create({
        data: {
          userId: id,
          type: "ADMIN_ADJUST",
          amount: delta,
          note: "Admin balance adjustment"
        }
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(balance !== undefined && { balance }),
        ...(plan && { plan }),
        ...(status && { status })
      }
    });

    res.json({ user: updatedUser });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: "Failed to update user" });
  }
});

router.get("/deposits/pending", requireAuth, requireAdmin, async (req, res) => {
  try {
    const deposits = await prisma.transaction.findMany({
      where: { type: "DEPOSIT", status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true, balance: true, plan: true, status: true } }
      }
    });

    res.json({ deposits });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to fetch pending deposits" });
  }
});

router.post("/deposits/:txId/approve", requireAuth, requireAdmin, async (req, res) => {
  const { txId } = req.params;

  try {
    const tx = await prisma.transaction.findUnique({ where: { id: txId } });
    if (!tx) return res.status(404).json({ error: "Transaction not found" });

    if (tx.type !== "DEPOSIT") return res.status(400).json({ error: "Not a deposit transaction" });
    if (tx.status !== "PENDING") return res.status(400).json({ error: "Deposit is not pending" });

    const result = await prisma.$transaction(async (db) => {
      const approvedTx = await db.transaction.update({
        where: { id: txId },
        data: { status: "APPROVED", note: "Approved by admin" }
      });

      const updatedUser = await db.user.update({
        where: { id: tx.userId },
        data: { balance: { increment: tx.amount } }
      });

      return { approvedTx, updatedUser };
    });

    res.json({ ok: true, transaction: result.approvedTx, user: result.updatedUser });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Failed to approve deposit" });
  }
});


export default router;
