import { Router } from 'express'
import Actividad from '../models/Actividad.js'
import Sede from '../models/Sede.js'
import Profesora from '../models/Profesora.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { sede_id } = req.query
  const where = { activo: true }
  if (sede_id) where.sede_id = sede_id
  // Profesora solo ve sus propios grupos
  if (req.user.rol === 'profesora') {
    if (!req.user.profesora_id) return res.json([])
    where.profesora_id = req.user.profesora_id
  }
  const list = await Actividad.findAll({
    where,
    include: [
      { model: Sede,     as: 'sede',     attributes: ['id','nombre'] },
      { model: Profesora,as: 'profesora',attributes: ['id','nombre','apellido','abreviatura'] },
    ],
    order: [['nombre', 'ASC']],
  })
  res.json(list)
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const a = await Actividad.create(req.body)
    res.json(a)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    await Actividad.update(req.body, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
