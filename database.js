import { Sequelize } from 'sequelize'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))

const dialectOptions = process.env.DB_SSL === 'true'
  ? { ssl: { ca: readFileSync(join(__dirname, 'aiven-ca.crt')), rejectUnauthorized: true } }
  : {}

export const sequelize = new Sequelize(
  process.env.DB_NAME || 'ritmica',
  process.env.DB_USER || 'root',
  process.env.DB_PASS || '',
  {
    host:    process.env.DB_HOST || 'localhost',
    port:    process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    dialectOptions,
    pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
  }
)
