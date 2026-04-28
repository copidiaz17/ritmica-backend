import { Router } from 'express'
import { Op } from 'sequelize'
import Cuota from '../models/Cuota.js'
import Egreso from '../models/Egreso.js'
import Alumna from '../models/Alumna.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Resumen del día o rango
router.get('/resumen', requireAuth, async (req, res) => {
  const fecha = req.query.fecha || new Date().toISOString().slice(0,10)
  const [cuotas, egresos] = await Promise.all([
    Cuota.findAll({
      where: { fecha_pago: fecha },
      include: [{ model: Alumna, as: 'alumna', attributes: ['id','nombre','apellido'] }],
    }),
    Egreso.findAll({ where: { fecha } }),
  ])
  const totalCuotas  = cuotas.reduce((s,c) => s + Number(c.monto), 0)
  const totalEgresos = egresos.reduce((s,e) => s + Number(e.monto), 0)
  res.json({ fecha, cuotas, egresos, totalCuotas, totalEgresos, saldo: totalCuotas - totalEgresos })
})

// Registrar egreso
router.post('/egresos', requireAuth, async (req, res) => {
  try {
    const e = await Egreso.create(req.body)
    res.json(e)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/egresos/:id', requireAuth, async (req, res) => {
  try {
    await Egreso.update(req.body, { where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.delete('/egresos/:id', requireAuth, async (req, res) => {
  await Egreso.destroy({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
