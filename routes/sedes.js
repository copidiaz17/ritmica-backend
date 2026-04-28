import { Router } from 'express'
import Sede from '../models/Sede.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const sedes = await Sede.findAll({ order: [['nombre', 'ASC']] })
  res.json(sedes)
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const sede = await Sede.create(req.body)
    res.json(sede)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    await Sede.update(req.body, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
