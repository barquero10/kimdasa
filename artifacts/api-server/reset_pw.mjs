import bcrypt from 'bcryptjs';
import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
const hash = await bcrypt.hash('Heredia2025', 12);
const r = await client.query("UPDATE users SET password_hash=$1 WHERE email='admin@kimdasa.com' RETURNING id,email,role", [hash]);
console.log(JSON.stringify(r.rows));
await client.end();
