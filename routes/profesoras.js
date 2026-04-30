import { Router } from 'express'
import Profesora from '../models/Profesora.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const profesoras = await Profesora.findAll({ where: { activo: true }, order: [['apellido', 'ASC'], ['nombre', 'ASC']] })
  res.json(profesoras)
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const p = await Profesora.create(req.body)
    res.json(p)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    await Profesora.update(req.body, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

export default router
