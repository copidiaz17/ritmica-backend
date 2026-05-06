import { Router } from 'express'
import { sequelize } from '../database.js'
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

// GET /api/profesoras/:id — perfil con grupos y alumnas
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const id = Number(req.params.id)
    const profe = await Profesora.findByPk(id)
    if (!profe) return res.status(404).json({ error: 'No encontrada' })

    const [grupos] = await sequelize.query(`
      SELECT
        act.id,
        act.nombre,
        act.horarios,
        act.mensualidad,
        act.profesora_id,
        act.profesora_id_2,
        s.nombre AS sede_nombre,
        p2.nombre AS profe2_nombre,
        p2.apellido AS profe2_apellido
      FROM actividades act
      LEFT JOIN sedes s ON s.id = act.sede_id
      LEFT JOIN profesoras p2 ON p2.id = act.profesora_id_2
      WHERE act.activo = 1
        AND (act.profesora_id = ? OR act.profesora_id_2 = ?)
      ORDER BY act.nombre ASC
    `, { replacements: [id, id] })

    const gruposConAlumnas = await Promise.all(grupos.map(async (g) => {
      const [alumnas] = await sequelize.query(`
        SELECT a.id, a.nombre, a.apellido, a.estado, a.foto
        FROM alumnas a
        JOIN alumna_actividades aa ON aa.alumna_id = a.id
        WHERE aa.actividad_id = ? AND a.activo = 1
        ORDER BY a.apellido ASC, a.nombre ASC
      `, { replacements: [g.id] })

      return {
        id: g.id,
        nombre: g.nombre,
        horarios: g.horarios,
        mensualidad: g.mensualidad,
        sede: g.sede_nombre,
        compartido: g.profesora_id_2 != null,
        profe2: g.profesora_id_2 ? { nombre: g.profe2_nombre, apellido: g.profe2_apellido } : null,
        alumnas,
      }
    }))

    res.json({ ...profe.toJSON(), grupos: gruposConAlumnas })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
