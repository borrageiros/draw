import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User";
import dbConnect from "@/lib/db/connection";

const JWT_SECRET = process.env.JWT_SECRET || "";

export async function register(data: {
  username: string;
  email: string;
  password: string;
}) {
  try {
    await dbConnect();
    const { username, email, password } = data;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return { error: "User already exists", status: 400 };
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Error in register:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function loginUser(data: {
  email: string;
  password: string;
  rememberMe?: boolean;
}) {
  try {
    await dbConnect();
    const { email: identifier, password, rememberMe } = data;

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!user) {
      return { error: "Invalid credentials", status: 401 };
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return { error: "Invalid credentials", status: 401 };
    }

    let tokenOptions = {};

    if (!rememberMe) {
      tokenOptions = { expiresIn: "7d" };
    }

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      tokenOptions
    );

    return {
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
      },
    };
  } catch (error) {
    console.error("Error in login:", error);
    return { error: "Internal server error", status: 500 };
  }
}

export async function validateToken(token: string): Promise<{
  user?: { id: string; username: string; email: string };
  error?: string;
  status: number;
}> {
  try {
    await dbConnect();
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return { error: "Invalid token - user not found", status: 401 };
    }

    return {
      user: {
        id: user._id.toString(),
        username: user.username,
        email: user.email,
      },
      status: 200,
    };
  } catch (error) {
    console.error("Error in validateToken:", error);
    if (error instanceof jwt.JsonWebTokenError) {
      return { error: "Invalid token", status: 401 };
    }
    return { error: "Internal server error", status: 500 };
  }
}
