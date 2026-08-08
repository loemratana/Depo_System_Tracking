import bcrypt from 'bcryptjs'
import { prisma } from '../src/config/db.js'

const username = process.env.LOCAL_ADMIN_EMAIL || 'admin@local.dev'
const password = process.env.LOCAL_ADMIN_PASSWORD || 'admin123'

const hash = await bcrypt.hash(password, 10)
const user = await prisma.user.upsert({
  where: { username },
  update: { passwordHash: hash, status: 'active', role: 'admin' },
  create: {
    username,
    passwordHash: hash,
    role: 'admin',
    status: 'active',
  },
})

console.log('local user ready:', user.username, user.role)
await prisma.$disconnect()
