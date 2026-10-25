import { createHash } from "crypto";

// Salt value for additional security
const SALT = "moamen_store_salt_2024";

// Function to hash the password
export const hashPassword = (password: string): string => {
  return createHash("sha256")
    .update(password + SALT)
    .digest("hex");
};

// Function to verify the password
export const verifyPassword = (
  password: string,
  hashedPassword: string
): boolean => {
  const hashedInput = hashPassword(password);
  return hashedInput === hashedPassword;
};

// The hashed version of the admin password (102030)
export const ADMIN_PASSWORD_HASH = hashPassword("102030");
