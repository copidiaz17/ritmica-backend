const XLSX = require('xlsx')
const wb = XLSX.readFile('C:/Users/Usuario/Downloads/Clientes_Santiago Rítmica.xlsx')
const ws = wb.Sheets[wb.SheetNames[0]]
const data = XLSX.utils.sheet_to_json(ws, { header: 1 })
console.log('HOJA:', wb.SheetNames[0])
console.log('HEADERS:', JSON.stringify(data[0]))
console.log('FILA2:', JSON.stringify(data[1]))
console.log('FILA3:', JSON.stringify(data[2]))
console.log('TOTAL FILAS:', data.length)
