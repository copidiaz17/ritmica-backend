import { Router } from 'express'
import { Op, fn, col, literal } from 'sequelize'
import Alumna from '../models/Alumna.js'
import Cuota from '../models/Cuota.js'
import Egreso from '../models/Egreso.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const hoy  = new Date()
  const mes  = hoy.getMonth() + 1
  const anio = hoy.getFullYear()
  const hoyStr = hoy.toISOString().slice(0,10)

  const [totalActivas, totalVisitas, cuotasMes, egresosMes, pagadas] = await Promise.all([
    Alumna.count({ where: { activo: true, estado: 'activa' } }),
    Alumna.count({ where: { activo: true, estado: 'visita' } }),
    Cuota.sum('monto', { where: { mes, anio } }) || 0,
    Egreso.sum('monto', { where: {
      fecha: { [Op.between]: [`${anio}-${String(mes).padStart(2,'0')}-01`, hoyStr] }
    } }) || 0,
    Cuota.count({ where: { mes, anio } }),
  ])

  // Alumnas que cumplen hoy
  const alumnas = await Alumna.findAll({
    where: { activo: true, fecha_nacimiento: { [Op.not]: null } },
    attributes: ['id','nombre','apellido','fecha_nacimiento'],
  })
  const cumpleaniosHoy = alumnas.filter(a => {
    const fn = new Date(a.fecha_nacimiento)
    return fn.getMonth() + 1 === mes && fn.getDate() === hoy.getDate()
  })

  res.json({
    totalActivas,
    totalVisitas,
    cuotasMes:  Number(cuotasMes  || 0),
    egresosMes: Number(egresosMes || 0),
    pagadasMes: pagadas,
    cumpleaniosHoy,
  })
})

// Evolución de ingresos últimos 6 meses
router.get('/ingresos-mensuales', requireAuth, async (req, res) => {
  const meses = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear() })
  }
  const result = await Promise.all(meses.map(async ({ mes, anio }) => {
    const total = await Cuota.sum('monto', { where: { mes, anio } }) || 0
    return { mes, anio, total: Number(total) }
  }))
  res.json(result)
})

export default router
