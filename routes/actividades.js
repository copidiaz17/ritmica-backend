import { Router } from 'express'
import { Op } from 'sequelize'
import Actividad from '../models/Actividad.js'
import Sede from '../models/Sede.js'
import Profesora from '../models/Profesora.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { sede_id } = req.query
  const where = { activo: true }
  if (sede_id) where.sede_id = sede_id
  // Profesora ve sus grupos + siempre Danza Fusión (para poder registrar ese pago)
  if (req.user.rol === 'profesora') {
    if (!req.user.profesora_id) return res.json([])
    const pid = req.user.profesora_id
    where[Op.or] = [
      { profesora_id: pid },
      { profesora_id_2: pid },
      { nombre: { [Op.like]: '%Danza Fusi%' } },
    ]
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

// Devuelve Danza Fusión (la crea si no existe) — sin filtro de rol
router.get('/danza-fusion', requireAuth, async (req, res) => {
  try {
    // Buscar sin filtrar por activo para encontrarla aunque esté desactivada
    let act = await Actividad.findOne({ where: { nombre: { [Op.like]: '%Danza Fusi%' } } })
    if (act) {
      // Reactivar si estaba inactiva
      if (!act.activo) await act.update({ activo: true })
    } else {
      // Buscar a Eugenia por nombre para no depender del ID hardcodeado
      const eugenia = await Profesora.findOne({ where: { nombre: { [Op.like]: '%Eugenia%' } } })
      const ref     = await Actividad.findOne({ where: { activo: true }, attributes: ['sede_id'] })
      act = await Actividad.create({
        nombre:       'Danza Fusión',
        descripcion:  'Clase de sábados a cargo de Eugenia Molina',
        sede_id:      ref?.sede_id || 1,
        profesora_id: eugenia?.id || null,
        capacidad:    30,
        mensualidad:  0,
        activo:       true,
      })
    }
    res.json(act)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
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
