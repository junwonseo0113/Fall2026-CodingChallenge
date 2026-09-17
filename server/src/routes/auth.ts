import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { UserModel } from "../models/User";
import { signToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { requireAuth, type AuthedRequest } from "../middleware/auth";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

/**
 * POST /api/auth/register -- public.
 * Body: { name, email, password }.
 * Creates an account and returns { token, user }.
 */
authRouter.post("/register", async (req, res, next) => {
  try {
    const { name, email, password } = registerSchema.parse(req.body);

    const existing = await UserModel.findOne({ email });
    if (existing) {
      throw new AppError(409, "An account with that email already exists");
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ name, email, passwordHash });

    const token = signToken({ userId: user.id });
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    next(err);
  }
});

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

/**
 * POST /api/auth/login -- public.
 * Body: { email, password }.
 * Returns { token, user } on success, 401 on bad credentials.
 */
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email });
    if (!user) {
      throw new AppError(401, "Invalid email or password");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new AppError(401, "Invalid email or password");
    }

    const token = signToken({ userId: user.id });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me -- requires Authorization: Bearer <token>.
 * Returns the current user's { id, name, email }.
 */
authRouter.get("/me", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    const user = await UserModel.findById(req.userId);
    if (!user) throw new AppError(404, "User not found");
    res.json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    next(err);
  }
});
