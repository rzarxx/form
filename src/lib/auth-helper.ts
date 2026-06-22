export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "salt-for-form-builder");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyAdminSession(sessionToken: string | undefined): Promise<boolean> {
  if (!sessionToken) return false;
  
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.warn("ADMIN_PASSWORD is not set in environment variables.");
    return false;
  }
  
  const expectedToken = await hashPassword(adminPassword);
  return sessionToken === expectedToken;
}
