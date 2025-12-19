import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { validate } from "../middleware/validate.js";

const prisma = new PrismaClient();
const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});


const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

function planBalance(plan) {
  return {
    Basic: 50,
    Silver: 250,
    Gold: 800,
    Platinum: 2500
  }[plan] || 50;
}

function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "2h" }
  );
}

router.post("/register", validate(registerSchema), async (req, res) => {
  const { name, email, password } = req.body;

  const exists = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (exists) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
        name,
        email: email.toLowerCase(),
        password: hashed,
        plan: "Basic",     // default until user chooses
        balance: 0         // deposit page will set this
    }
  });
  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      balance: user.balance,
      role: user.role
    }
  });
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (user.status === "LOCKED") {
    return res.status(403).json({ error: "Account locked" });
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = signToken(user);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      plan: user.plan,
      balance: user.balance,
      role: user.role
    }
  });
});

export default router;
