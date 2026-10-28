// Capa de persistencia: único módulo que toca localStorage.
// Las demás capas reciben y entregan arreglos de incidencias; no saben cómo se guardan.

import { CATEGORIAS, CLAVES, ESTADOS, EVENTO_CAMBIO, PREFIJO_ID, PRIORIDADES } from './config.js';
import { crearDatosDemo } from './demo-data.js';

const PATRON_ID = new RegExp(`^${PREFIJO_ID}-(\\d{4})-(\\d{4,})$`);

/** Error de escritura (cuota llena, almacenamiento bloqueado por el navegador, etc.). */
export class ErrorAlmacenamiento extends Error {
  constructor(mensaje, causa) {
    super(mensaje, { cause: causa });
    this.name = 'ErrorAlmacenamiento';
  }
}

/** INC-2026-0007. Usa al menos 4 dígitos; si el correlativo pasa de 9999 crece sin cortarse. */
export function formatearId(anio, numero) {
  return `${PREFIJO_ID}-${anio}-${String(numero).padStart(4, '0')}`;
}

/** Número correlativo de un id ("INC-2026-0007" → 7), o null si el formato no es válido. */
export function numeroDeId(id) {
  const coincidencia = PATRON_ID.exec(id);
  return coincidencia ? Number(coincidencia[2]) : null;
}

const esTexto = (valor) => typeof valor === 'string' && valor.trim().length > 0;
const esFechaIso = (valor) => typeof valor === 'string' && !Number.isNaN(Date.parse(valor));

/** Comprueba que un objeto leído de localStorage tenga la forma de una incidencia. */
export function esIncidenciaValida(i) {
  return i !== null
    && typeof i === 'object'
    && typeof i.id === 'string' && PATRON_ID.test(i.id)
    && esTexto(i.titulo)
    && esTexto(i.descripcion)
    && esTexto(i.responsable)
    && CATEGORIAS.includes(i.categoria)
    && PRIORIDADES.includes(i.prioridad)
    && ESTADOS.includes(i.estado)
    && esFechaIso(i.fechaRegistro)
    && esFechaIso(i.fechaActualizacion);
}

/**
 * Lee las incidencias guardadas.
 * - 'vacio': nunca se guardó nada (primera visita).
 * - 'ok': datos válidos (puede ser un arreglo vacío si el usuario eliminó todo).
 * - 'corrupto': el texto guardado no es JSON o no tiene la forma esperada. No se borra nada.
 * - 'no-disponible': el navegador bloquea localStorage.
 * @returns {{ estado: 'vacio'|'ok'|'corrupto'|'no-disponible', incidencias: object[], detalle?: string }}
 */
export function cargarIncidencias() {
  let texto;
  try {
    texto = localStorage.getItem(CLAVES.incidencias);
  } catch (error) {
    return { estado: 'no-disponible', incidencias: [], detalle: error.message };
  }

  if (texto === null) return { estado: 'vacio', incidencias: [] };

  let datos;
  try {
    datos = JSON.parse(texto);
  } catch (error) {
    return { estado: 'corrupto', incidencias: [], detalle: `JSON inválido: ${error.message}` };
  }

  if (!Array.isArray(datos)) {
    return { estado: 'corrupto', incidencias: [], detalle: 'Se esperaba un arreglo de incidencias.' };
  }
  const invalida = datos.findIndex((i) => !esIncidenciaValida(i));
  if (invalida !== -1) {
    return { estado: 'corrupto', incidencias: [], detalle: `La incidencia en la posición ${invalida} no tiene el formato esperado.` };
  }
  if (new Set(datos.map((i) => i.id)).size !== datos.length) {
    return { estado: 'corrupto', incidencias: [], detalle: 'Hay incidencias con el id repetido.' };
  }

  return { estado: 'ok', incidencias: datos };
}

function escribir(clave, valor) {
  try {
    localStorage.setItem(clave, valor);
  } catch (error) {
    throw new ErrorAlmacenamiento('No se pudieron guardar los datos en este navegador.', error);
  }
}

/**
 * Guarda el arreglo completo de incidencias y avisa con EVENTO_CAMBIO.
 * Lanza ErrorAlmacenamiento si el navegador lo impide.
 */
export function guardarIncidencias(incidencias) {
  escribir(CLAVES.incidencias, JSON.stringify(incidencias));
  // Todo cambio pasa por aquí, así que es el único lugar que necesita avisar a las vistas.
  document.dispatchEvent(new CustomEvent(EVENTO_CAMBIO));
}

// Si falta el correlativo (o lo alteraron a mano), se parte del mayor número usado en los datos guardados:
// así nunca se repite un id que exista. Los ids de incidencias ya eliminadas solo los recuerda el correlativo.
function correlativoActual() {
  try {
    const guardado = Number(localStorage.getItem(CLAVES.correlativo));
    const { incidencias } = cargarIncidencias();
    const mayorEnUso = Math.max(0, ...incidencias.map((i) => numeroDeId(i.id)));
    return Math.max(Number.isSafeInteger(guardado) && guardado > 0 ? guardado : 0, mayorEnUso);
  } catch {
    return 0;
  }
}

/**
 * Reserva y devuelve el siguiente id. El correlativo se guarda al instante y nunca retrocede,
 * así que un id de una incidencia eliminada no se reutiliza.
 * @param {Date} [fecha] Fecha de registro; su año va en el id.
 */
export function generarId(fecha = new Date()) {
  const siguiente = correlativoActual() + 1;
  escribir(CLAVES.correlativo, String(siguiente));
  return formatearId(fecha.getFullYear(), siguiente);
}

/**
 * Reemplaza todo con las 20 incidencias de demostración y reinicia el correlativo.
 * Es lo único que reinicia el correlativo: el usuario lo pidió de forma explícita.
 * @returns {object[]} Las incidencias guardadas.
 */
export function restablecerDemo(ahora = new Date()) {
  const incidencias = crearDatosDemo(ahora).map((datos, indice) => ({
    id: formatearId(new Date(datos.fechaRegistro).getFullYear(), indice + 1),
    ...datos,
  }));
  guardarIncidencias(incidencias);
  escribir(CLAVES.correlativo, String(incidencias.length));
  return incidencias;
}

/**
 * Carga inicial de la app: si es la primera visita, guarda los datos demo.
 * Con datos corruptos no toca nada; la interfaz decide si ofrecer restablecer.
 */
export function inicializar() {
  const resultado = cargarIncidencias();
  if (resultado.estado !== 'vacio') return resultado;
  try {
    return { estado: 'demo', incidencias: restablecerDemo() };
  } catch (error) {
    return { estado: 'no-disponible', incidencias: [], detalle: error.message };
  }
}
