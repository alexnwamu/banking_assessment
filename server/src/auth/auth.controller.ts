import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { generateToken } from "../middleware/auth.middleware";
import { User, AuthResponse, UserResponse } from "../types/auth.types";
import {
  registerSchema,
  loginSchema,
  RegisterInput,
  LoginInput,
} from "../schemas/auth.schema";

export const register = async (req: Request, res: Response): Promise<void> => {
  const parseResult = registerSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues[0]?.message || "Validation failed",
      errors: parseResult.error.issues,
    });
    return;
  }

  const { email, password, name }: RegisterInput = parseResult.data;

  try {
    // Check if user already exists
    const existingUser = await new Promise<User | undefined>(
      (resolve, reject) => {
        db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
          if (err) reject(err);
          resolve(row as User | undefined);
        });
      }
    );

    if (existingUser) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert user
    const insertResult = await new Promise<number>((resolve, reject) => {
      db.run(
        "INSERT INTO users (email, password, name) VALUES (?, ?, ?)",
        [email, hashedPassword, name],
        function (err) {
          if (err) reject(err);
          resolve(this.lastID);
        }
      );
    });

    const userResponse: UserResponse = {
      id: insertResult,
      email,
      name,
      created_at: new Date().toISOString(),
    };

    const token = generateToken({ userId: insertResult, email });

    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  const parseResult = loginSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: parseResult.error.issues[0]?.message || "Validation failed",
      errors: parseResult.error.issues,
    });
    return;
  }

  const { email, password }: LoginInput = parseResult.data;

  try {
    // Find user
    const user = await new Promise<User | undefined>((resolve, reject) => {
      db.get("SELECT * FROM users WHERE email = ?", [email], (err, row) => {
        if (err) reject(err);
        resolve(row as User | undefined);
      });
    });

    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const userResponse: UserResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      created_at: user.created_at,
    };

    const token = generateToken({ userId: user.id, email: user.email });

    const response: AuthResponse = {
      user: userResponse,
      token,
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Failed to login" });
  }
};

export const getMe = async (req: Request, res: Response): Promise<void> => {
  const userId = (req as any).user?.userId;

  if (!userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const user = await new Promise<User | undefined>((resolve, reject) => {
      db.get(
        "SELECT id, email, name, created_at FROM users WHERE id = ?",
        [userId],
        (err, row) => {
          if (err) reject(err);
          resolve(row as User | undefined);
        }
      );
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ error: "Failed to get user" });
  }
};
