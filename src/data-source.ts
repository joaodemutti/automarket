import "reflect-metadata"
import { DataSource } from "typeorm"

const databaseUrl = process.env.DATABASE_URL
const sslMode = process.env.DATABASE_SSL

const shouldUseSsl =
    sslMode === "true" ||
    databaseUrl?.includes("sslmode=require") ||
    databaseUrl?.includes("neon.tech") ||
    false

export const AppDataSource = new DataSource({
    type: "postgres",
    ...(databaseUrl
        ? { url: databaseUrl, ssl: shouldUseSsl ? { rejectUnauthorized: false } : false }
        : { host: "localhost", port: 5432, username: "test", password: "test", database: "test" }),
    synchronize: false,
    logging: false,
    entities: ["src/entity/*.entity{.ts,.js}"],
    migrations: ["src/migration/*{.ts,.js}"],
    subscribers: [],
})
