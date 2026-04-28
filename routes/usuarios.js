import { Router } from 'express'
import Usuario from '../models/Usuario.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAdmin, async (req, res) => {
  const usuarios = await Usuario.findAll({ attributes: { exclude: ['password'] }, order: [['nombre','ASC']] })
  res.json(usuarios)
})

router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol } = req.body
    const hash = await Usuario.hashPassword(password)
    const u = await Usuario.create({ nombre, email: email.toLowerCase().trim(), password: hash, rol })
    res.json({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { password, ...data } = req.body
    if (password) data.password = await Usuario.hashPassword(password)
    await Usuario.update(data, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
