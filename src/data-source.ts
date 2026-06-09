import "reflect-metadata"
import { DataSource } from "typeorm"

export const AppDataSource = new DataSource({
    type: "postgres",
    ...(process.env.DATABASE_URL
        ? { url: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false }
        : { host: "localhost", port: 5432, username: "test", password: "test", database: "test" }),
    synchronize: false,
    logging: false,
    entities: ["src/entity/*.entity{.ts,.js}"],
    migrations: ["src/migration/*{.ts,.js}"],
    subscribers: [],
})
