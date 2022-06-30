import { readFileSync } from 'fs'


export default JSON.parse(readFileSync('./app/settings.json', 'utf-8'))