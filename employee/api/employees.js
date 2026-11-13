import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed",
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    const result = await sql`SELECT 1 AS connected`;

    return res.status(200).json({
      message: "Neon database connected",
      result,
    });
  } catch (error) {
    console.error("Database connection failed");

    return res.status(500).json({
      error: "Database connection failed",
    });
  }
}