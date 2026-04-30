import { Router } from 'express'
import { Op } from 'sequelize'
import Alumna from '../models/Alumna.js'
import Actividad from '../models/Actividad.js'
import Sede from '../models/Sede.js'
import Profesora from '../models/Profesora.js'
import { requireAuth } from '../middleware/auth.js'
import multer from 'multer'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const uploadDir = join(__dirname, '../public/fotos')
mkdirSync(uploadDir, { recursive: true })

const router = Router()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`),
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

const INCLUDE = [
  {
    model: Actividad, as: 'actividades',
    through: { attributes: [] },
    include: [
      { model: Sede,     as: 'sede',     attributes: ['id','nombre'] },
      { model: Profesora,as: 'profesora',attributes: ['id','nombre','apellido'] },
    ],
  },
]

// IDs de actividades que pertenecen a la profesora
async function actividadesDeProfe(profesora_id) {
  const acts = await Actividad.findAll({ where: { profesora_id }, attributes: ['id'] })
  return acts.map(a => a.id)
}

// ── GET /api/alumnas ──────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const { q, estado, actividad_id } = req.query
    const where = { activo: true }
    if (estado) where.estado = estado
    if (q) where[Op.or] = [
      { nombre:   { [Op.like]: `%${q}%` } },
      { apellido: { [Op.like]: `%${q}%` } },
      { documento:{ [Op.like]: `%${q}%` } },
    ]

    // Profesora: solo ve alumnas de sus grupos
    if (req.user.rol === 'profesora') {
      if (!req.user.profesora_id) return res.json([])
      const include = [{ ...INCLUDE[0], where: { profesora_id: req.user.profesora_id }, required: true }]
      const alumnas = await Alumna.findAll({ where, include, order: [['apellido','ASC'],['nombre','ASC']] })
      return res.json(alumnas)
    }

    let include = INCLUDE
    if (actividad_id) {
      include = [{ ...INCLUDE[0], where: { id: actividad_id }, required: true }]
    }

    const alumnas = await Alumna.findAll({ where, include, order: [['apellido','ASC'],['nombre','ASC']] })
    res.json(alumnas)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/alumnas/cumpleanios ──────────────────────────────────────────────
router.get('/cumpleanios', requireAuth, async (req, res) => {
  try {
    const hoy = new Date()
    const alumnas = await Alumna.findAll({
      where: { activo: true, estado: 'activa', fecha_nacimiento: { [Op.not]: null } },
      attributes: ['id','nombre','apellido','fecha_nacimiento'],
      order: [['apellido','ASC']],
    })
    const mes = hoy.getMonth() + 1
    const dia = hoy.getDate()
    const proximas = alumnas.filter(a => {
      const fn = new Date(a.fecha_nacimiento)
      const diff = (fn.getMonth() + 1 - mes) * 30 + (fn.getDate() - dia)
      return diff >= 0 && diff <= 7
    })
    res.json(proximas)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/alumnas/:id ──────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const alumna = await Alumna.findByPk(req.params.id, { include: INCLUDE })
    if (!alumna) return res.status(404).json({ error: 'No encontrada' })

    // Profesora: verificar que la alumna pertenece a sus grupos
    if (req.user.rol === 'profesora' && req.user.profesora_id) {
      const perteneceAMiGrupo = alumna.actividades?.some(a => a.profesora?.id === req.user.profesora_id)
      if (!perteneceAMiGrupo) return res.status(403).json({ error: 'Acceso denegado' })
    }

    res.json(alumna)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/alumnas ─────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  try {
    const { actividades, ...data } = req.body
    const alumna = await Alumna.create(data)

    if (req.user.rol === 'profesora' && req.user.profesora_id) {
      // Siempre asignar sus propios grupos (ignora lo que mande el frontend)
      const misIds = await actividadesDeProfe(req.user.profesora_id)
      if (misIds.length) await alumna.setActividades(misIds)
    } else {
      if (actividades?.length) await alumna.setActividades(actividades)
    }

    const full = await Alumna.findByPk(alumna.id, { include: INCLUDE })
    res.json(full)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/alumnas/:id ──────────────────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { actividades, ...data } = req.body
    await Alumna.update(data, { where: { id: req.params.id } })

    if (req.user.rol === 'profesora') {
      // Profesora no puede cambiar la asignación de grupos
    } else if (actividades !== undefined) {
      const alumna = await Alumna.findByPk(req.params.id)
      await alumna.setActividades(actividades)
    }

    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ── PUT /api/alumnas/:id/cambiar-grupo (solo profesoras) ─────────────────────
router.put('/:id/cambiar-grupo', requireAuth, async (req, res) => {
  try {
    if (req.user.rol !== 'profesora' || !req.user.profesora_id) {
      return res.status(403).json({ error: 'Solo profesoras pueden usar este endpoint' })
    }
    const { actividad_id_nueva } = req.body
    if (!actividad_id_nueva) return res.status(400).json({ error: 'actividad_id_nueva es requerido' })

    const alumna = await Alumna.findByPk(req.params.id, { include: INCLUDE })
    if (!alumna) return res.status(404).json({ error: 'Alumna no encontrada' })

    // Verificar que la alumna pertenece a uno de los grupos de esta profesora
    const misActIds = await actividadesDeProfe(req.user.profesora_id)
    const alumnaEnMiGrupo = alumna.actividades?.some(a => misActIds.includes(a.id))
    if (!alumnaEnMiGrupo) return res.status(403).json({ error: 'La alumna no pertenece a tus grupos' })

    // Verificar que el grupo destino existe y está activo
    const actNueva = await Actividad.findOne({ where: { id: actividad_id_nueva, activo: true } })
    if (!actNueva) return res.status(404).json({ error: 'Grupo destino no encontrado' })

    // Quitar de los grupos de esta profesora y agregar al nuevo grupo
    const otrasActividades = alumna.actividades
      .filter(a => !misActIds.includes(a.id))
      .map(a => a.id)
    await alumna.setActividades([...otrasActividades, Number(actividad_id_nueva)])

    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/alumnas/:id/foto ────────────────────────────────────────────────
router.post('/:id/foto', requireAuth, upload.single('foto'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió imagen' })
  const url = `/fotos/${req.file.filename}`
  await Alumna.update({ foto: url }, { where: { id: req.params.id } })
  res.json({ url })
})

export default router
