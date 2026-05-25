import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { config } from "./config";

const pool = new Pool({
  connectionString: config.databaseUrl,
  max: 10,
});

export const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

export async function closeDatabaseConnections() {
  await prisma.$disconnect();
  await pool.end();
}
