import { Router } from 'express'
import { Op } from 'sequelize'
import Cuota from '../models/Cuota.js'
import Alumna from '../models/Alumna.js'
import Actividad from '../models/Actividad.js'
import { requireAuth } from '../middleware/auth.js'
import multer from 'multer'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const comprobantesDir = join(__dirname, '../public/comprobantes')
mkdirSync(comprobantesDir, { recursive: true })

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, comprobantesDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

const router = Router()

const ALUMNA_INCLUDE = { model: Alumna, as: 'alumna', attributes: ['id','nombre','apellido','foto'] }

// IDs de alumnas que pertenecen a los grupos de la profesora (prof_1 o prof_2)
async function alumnaIdsDeProfe(profesora_id) {
  const alumnas = await Alumna.findAll({
    where: { activo: true },
    include: [{
      model: Actividad, as: 'actividades', required: true, attributes: [],
      where: { [Op.or]: [{ profesora_id }, { profesora_id_2: profesora_id }], activo: true },
    }],
    attributes: ['id'],
  })
  return alumnas.map(a => a.id)
}

// IDs de alumnas que pertenecen a una actividad
async function alumnaIdsDeActividad(actividad_id) {
  const alumnas = await Alumna.findAll({
    where: { activo: true },
    include: [{ model: Actividad, as: 'actividades', where: { id: actividad_id }, required: true, through: { attributes: [] }, attributes: [] }],
    attributes: ['id'],
  })
  return alumnas.map(a => a.id)
}

// Intersecta dos arrays de IDs (devuelve los que están en ambos)
function intersect(a, b) {
  const setB = new Set(b)
  return a.filter(x => setB.has(x))
}

// ── GET /api/cuotas ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { mes, anio, alumna_id, fecha_desde, fecha_hasta, actividad_id, profesora_id: profIdFiltro } = req.query
    const where = {}

    if (fecha_desde || fecha_hasta) {
      const desde = fecha_desde ? new Date(fecha_desde) : new Date('2000-01-01')
      const hasta = fecha_hasta ? new Date(fecha_hasta + 'T23:59:59') : new Date()
      where.fecha_pago = { [Op.between]: [desde, hasta] }
    } else {
      if (mes)  where.mes  = mes
      if (anio) where.anio = anio
    }

    if (alumna_id) where.alumna_id = alumna_id

    let idsRestringidos = null

    if (actividad_id) {
      const ids = await alumnaIdsDeActividad(actividad_id)
      idsRestringidos = ids
    }

    if (profIdFiltro && req.user.rol !== 'profesora') {
      const ids = await alumnaIdsDeProfe(Number(profIdFiltro))
      idsRestringidos = idsRestringidos !== null ? intersect(idsRestringidos, ids) : ids
    }

    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.json([])
      const misIds = await alumnaIdsDeProfe(req.user.profesora_id)
      if (!misIds.length) return res.json([])
      idsRestringidos = idsRestringidos !== null ? intersect(idsRestringidos, misIds) : misIds
    }

    if (idsRestringidos !== null) {
      if (!idsRestringidos.length) return res.json([])
      if (alumna_id) {
        if (!idsRestringidos.includes(Number(alumna_id))) return res.json([])
        where.alumna_id = alumna_id
      } else {
        where.alumna_id = { [Op.in]: idsRestringidos }
      }
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

    const pagadas    = await Cuota.findAll({ where: { mes, anio }, attributes: ['alumna_id'] })
    const idsPagadas = pagadas.map(c => c.alumna_id)

    const whereAlumna = {
      activo: true,
      estado: 'activa',
      ...(idsPagadas.length ? { id: { [Op.notIn]: idsPagadas } } : {}),
    }

    let includeActs = [{ model: Actividad, as: 'actividades', attributes: ['id','nombre'], through: { attributes: [] } }]

    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.json({ mes, anio, alumnas: [] })
      const misIds = await alumnaIdsDeProfe(req.user.profesora_id)
      if (!misIds.length) return res.json({ mes, anio, alumnas: [] })
      whereAlumna.id = idsPagadas.length
        ? { [Op.and]: [{ [Op.notIn]: idsPagadas }, { [Op.in]: misIds }] }
        : { [Op.in]: misIds }
      includeActs = [{
        model: Actividad, as: 'actividades', attributes: ['id','nombre'], through: { attributes: [] },
        where: { [Op.or]: [{ profesora_id: req.user.profesora_id }, { profesora_id_2: req.user.profesora_id }], activo: true },
      }]
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

// ── POST /api/cuotas/:id/comprobante ─────────────────────────────────────────
router.post('/:id/comprobante', requireAuth, upload.single('comprobante'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' })
    const url = `/comprobantes/${req.file.filename}`
    await Cuota.update({ comprobante: url }, { where: { id: req.params.id } })
    res.json({ url })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
