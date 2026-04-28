import { Router } from 'express'
import { Op } from 'sequelize'
import Cuota from '../models/Cuota.js'
import Alumna from '../models/Alumna.js'
import Actividad from '../models/Actividad.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

const ALUMNA_INCLUDE = { model: Alumna, as: 'alumna', attributes: ['id','nombre','apellido','foto'] }

// IDs de alumnas que pertenecen a los grupos de la profesora
async function alumnaIdsDeProfe(profesora_id) {
  const alumnas = await Alumna.findAll({
    where: { activo: true },
    include: [{ model: Actividad, as: 'actividades', where: { profesora_id }, required: true, attributes: [] }],
    attributes: ['id'],
  })
  return alumnas.map(a => a.id)
}

// ── GET /api/cuotas ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { mes, anio, alumna_id } = req.query
    const where = {}
    if (mes)       where.mes       = mes
    if (anio)      where.anio      = anio
    if (alumna_id) where.alumna_id = alumna_id

    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.json([])
      const ids = await alumnaIdsDeProfe(req.user.profesora_id)
      if (!ids.length) return res.json([])
      where.alumna_id = alumna_id && ids.includes(Number(alumna_id)) ? alumna_id : { [Op.in]: ids }
    }

    const cuotas = await Cuota.findAll({ where, include: [ALUMNA_INCLUDE], order: [['fecha_pago','DESC']] })
    res.json(cuotas)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/cuotas/vencidas ──────────────────────────────────────────────────
router.get('/vencidas', requireAuth, async (req, res) => {
  try {
    const hoy  = new Date()
    const mes  = hoy.getMonth() + 1
    const anio = hoy.getFullYear()

    // IDs que ya pagaron este mes
    const pagadas    = await Cuota.findAll({ where: { mes, anio }, attributes: ['alumna_id'] })
    const idsPagadas = pagadas.map(c => c.alumna_id)

    const whereAlumna = {
      activo: true,
      estado: 'activa',
      ...(idsPagadas.length ? { id: { [Op.notIn]: idsPagadas } } : {}),
    }

    let includeActs = [{ model: Actividad, as: 'actividades', attributes: ['id','nombre'], through: { attributes: [] } }]

    // Profesora: solo sus alumnas deudoras
    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.json({ mes, anio, alumnas: [] })
      const misIds = await alumnaIdsDeProfe(req.user.profesora_id)
      if (!misIds.length) return res.json({ mes, anio, alumnas: [] })
      whereAlumna.id = idsPagadas.length
        ? { [Op.and]: [{ [Op.notIn]: idsPagadas }, { [Op.in]: misIds }] }
        : { [Op.in]: misIds }
      includeActs = [{ model: Actividad, as: 'actividades', where: { profesora_id: req.user.profesora_id }, attributes: ['id','nombre'], through: { attributes: [] } }]
    }

    const alumnas = await Alumna.findAll({
      where: whereAlumna,
      attributes: ['id','nombre','apellido','foto'],
      include: includeActs,
      order: [['apellido','ASC']],
    })
    res.json({ mes, anio, alumnas })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/cuotas ──────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.status(403).json({ error: 'Sin acceso' })
      const ids = await alumnaIdsDeProfe(req.user.profesora_id)
      if (!ids.includes(Number(req.body.alumna_id)))
        return res.status(403).json({ error: 'La alumna no pertenece a tu grupo' })
    }
    const cuota = await Cuota.create(req.body)
    res.json(cuota)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/cuotas/:id ───────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    await Cuota.update(req.body, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── DELETE /api/cuotas/:id (solo admin/recepcion) ─────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    if (req.user.rol === 'profesora') return res.status(403).json({ error: 'Sin permiso' })
    await Cuota.destroy({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
