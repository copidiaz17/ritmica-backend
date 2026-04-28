import { Router } from 'express'
import Usuario from '../models/Usuario.js'
import Profesora from '../models/Profesora.js'
import { requireAuth, requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/usuarios — lista todos los usuarios con info de su profesora si aplica
router.get('/', requireAdmin, async (req, res) => {
  try {
    const usuarios = await Usuario.findAll({
      attributes: { exclude: ['password'] },
      order: [['nombre', 'ASC']],
    })
    // Adjuntar nombre de profesora cuando corresponde
    const profesoras = await Profesora.findAll({ attributes: ['id', 'nombre', 'apellido'] })
    const profeMap = Object.fromEntries(profesoras.map(p => [p.id, p]))
    const data = usuarios.map(u => ({
      ...u.toJSON(),
      profesora: u.profesora_id ? profeMap[u.profesora_id] || null : null,
    }))
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/usuarios — crear usuario (si es profesora, vincular profesora_id)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { nombre, email, password, rol, profesora_id } = req.body
    if (!password) return res.status(400).json({ error: 'La contraseña es obligatoria' })
    const hash = await Usuario.hashPassword(password)
    const u = await Usuario.create({
      nombre,
      email: email.toLowerCase().trim(),
      password: hash,
      rol,
      profesora_id: rol === 'profesora' ? (profesora_id || null) : null,
    })
    res.json({ id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, profesora_id: u.profesora_id })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT /api/usuarios/:id — editar usuario
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { password, rol, profesora_id, ...data } = req.body
    if (password) data.password = await Usuario.hashPassword(password)
    if (rol) data.rol = rol
    data.profesora_id = rol === 'profesora' ? (profesora_id || null) : null
    await Usuario.update(data, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
