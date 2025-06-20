import User from "../models/User";
import dbConnect from "@/lib/db/connection";

export async function getUsers() {
  try {
    await dbConnect();
    const users = await User.find();
    return users;
  } catch (error) {
    console.error("Error in getUsers:", error);
    return { error: "Internal server error", status: 500 };
  }
}