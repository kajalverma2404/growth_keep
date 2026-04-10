import { sql } from "./src/server/db.js";

async function test() {
  try {
    console.log("Testing database connection...");
    const res = await sql("SELECT NOW()");
    console.log("Connection successful!", res[0]);
    process.exit(0);
  } catch (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
}

test();
