// Lógica de negocio de las incidencias: validación, sanitización y operaciones CRUD.
// No toca el DOM: recibe datos y devuelve resultados o lanza errores, así se puede probar desde la consola.

import { CATEGORIAS, ESTADOS, LIMITES, PRIORIDADES } from './config.js';
import { cargarIncidencias, generarId, guardarIncidencias } from './storage.js';

const CAMPOS_EDITABLES = ['titulo', 'descripcion', 'categoria', 'prioridad', 'estado', 'responsable'];

/** Datos inválidos. `errores` tiene un mensaje por campo: { titulo: '...', categoria: '...' }. */
export class ErrorValidacion extends Error {
  constructor(errores) {
    super('Revise los campos marcados.');
    this.name = 'ErrorValidacion';
    this.errores = errores;
  }
}

// Caracteres de control invisibles (salvo salto de línea y tabulación), que no aportan nada y pueden romper la vista.
const CONTROL = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

/**
 * Limpia los datos antes de validar y guardar: quita espacios sobrantes y caracteres de control,
 * y acota la longitud como última defensa (el formulario ya limita con maxlength).
 */
export function sanitizar(datos) {
  // Se acota a max + 1 a propósito: un texto demasiado largo llega a validar() y se rechaza,
  // en lugar de guardarse cortado sin que el usuario lo note.
  const linea = (valor, max) => String(valor ?? '').replace(CONTROL, '').replace(/\s+/g, ' ').trim().slice(0, max);
  return {
    titulo: linea(datos.titulo, LIMITES.titulo.max + 1),
    // La descripción conserva los saltos de línea; solo se quitan los espacios al inicio y al final.
    descripcion: String(datos.descripcion ?? '').replace(CONTROL, '').replace(/\r\n?/g, '\n').trim().slice(0, LIMITES.descripcion.max + 1),
    categoria: String(datos.categoria ?? ''),
    prioridad: String(datos.prioridad ?? ''),
    estado: String(datos.estado ?? ''),
    responsable: linea(datos.responsable, LIMITES.responsable.max + 1),
  };
}

/**
 * Valida datos ya sanitizados con las reglas de config.js.
 * @returns {Record<string, string>} Un mensaje por campo inválido; vacío si todo está bien.
 */
export function validar(datos) {
  const errores = {};
  const longitud = (campo, nombre, obligatorio) => {
    const { min, max } = LIMITES[campo];
    const largo = datos[campo].length;
    if (largo === 0) errores[campo] = `${nombre} es ${obligatorio}.`;
    else if (largo < min || largo > max) errores[campo] = `${nombre} debe tener entre ${min} y ${max} caracteres (ahora tiene ${largo}).`;
  };

  longitud('titulo', 'El título', 'obligatorio');
  longitud('descripcion', 'La descripción', 'obligatoria');
  longitud('responsable', 'El responsable', 'obligatorio');
  if (!CATEGORIAS.includes(datos.categoria)) errores.categoria = 'Seleccione una categoría.';
  if (!PRIORIDADES.includes(datos.prioridad)) errores.prioridad = 'Seleccione una prioridad.';
  if (!ESTADOS.includes(datos.estado)) errores.estado = 'Seleccione un estado.';
  return errores;
}

function prepararDatos(datos) {
  const limpios = sanitizar(datos);
  const errores = validar(limpios);
  if (Object.keys(errores).length > 0) throw new ErrorValidacion(errores);
  return limpios;
}

// Siempre se lee lo último guardado: otra pestaña pudo haber cambiado los datos.
function leerParaModificar() {
  const { estado, incidencias } = cargarIncidencias();
  if (estado !== 'ok') throw new Error('No se pueden modificar las incidencias porque los datos guardados no son válidos.');
  return incidencias;
}

function buscarIndice(incidencias, id) {
  const indice = incidencias.findIndex((i) => i.id === id);
  if (indice === -1) throw new Error(`La incidencia ${id} ya no existe (pudo eliminarse en otra pestaña).`);
  return indice;
}

/** Devuelve una incidencia por id, o undefined. */
export function obtenerIncidencia(id) {
  return cargarIncidencias().incidencias.find((i) => i.id === id);
}

/**
 * Registra una incidencia nueva. Lanza ErrorValidacion si los datos no son válidos.
 * @returns {object} La incidencia guardada, con id y fechas.
 */
export function crearIncidencia(datos) {
  const limpios = prepararDatos(datos);
  const incidencias = leerParaModificar();
  const ahora = new Date();
  const nueva = {
    id: generarId(ahora),
    ...limpios,
    fechaRegistro: ahora.toISOString(),
    fechaActualizacion: ahora.toISOString(),
  };
  guardarIncidencias([...incidencias, nueva]);
  return nueva;
}

/**
 * Actualiza los campos editables. Si nada cambió no guarda ni toca fechaActualizacion.
 * @returns {{ incidencia: object, cambio: boolean }}
 */
export function actualizarIncidencia(id, datos) {
  const limpios = prepararDatos(datos);
  const incidencias = leerParaModificar();
  const indice = buscarIndice(incidencias, id);
  const actual = incidencias[indice];

  if (CAMPOS_EDITABLES.every((campo) => actual[campo] === limpios[campo])) {
    return { incidencia: actual, cambio: false };
  }
  const actualizada = { ...actual, ...limpios, fechaActualizacion: new Date().toISOString() };
  incidencias[indice] = actualizada;
  guardarIncidencias(incidencias);
  return { incidencia: actualizada, cambio: true };
}

/**
 * Cambia solo el estado (desde la tabla, sin abrir el formulario).
 * @returns {{ incidencia: object, cambio: boolean }}
 */
export function cambiarEstado(id, estado) {
  if (!ESTADOS.includes(estado)) throw new ErrorValidacion({ estado: 'Seleccione un estado.' });
  const incidencias = leerParaModificar();
  const indice = buscarIndice(incidencias, id);
  const actual = incidencias[indice];
  if (actual.estado === estado) return { incidencia: actual, cambio: false };

  incidencias[indice] = { ...actual, estado, fechaActualizacion: new Date().toISOString() };
  guardarIncidencias(incidencias);
  return { incidencia: incidencias[indice], cambio: true };
}

// Sin tildes y en minúsculas: "ramirez" encuentra "Ramírez" y "critico" encuentra "crítico".
const normalizar = (texto) => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

/**
 * Filtra por texto (id, título o responsable) combinado con prioridad, estado y categoría.
 * Un filtro vacío ('') no restringe nada.
 */
export function filtrarIncidencias(incidencias, { texto = '', prioridad = '', estado = '', categoria = '' } = {}) {
  const buscado = normalizar(texto);
  return incidencias.filter((i) => (!prioridad || i.prioridad === prioridad)
    && (!estado || i.estado === estado)
    && (!categoria || i.categoria === categoria)
    && (!buscado || [i.id, i.titulo, i.responsable].some((campo) => normalizar(campo).includes(buscado))));
}

/** Elimina una incidencia. Su id no se reutiliza: el correlativo no retrocede. */
export function eliminarIncidencia(id) {
  const incidencias = leerParaModificar();
  const indice = buscarIndice(incidencias, id);
  const [eliminada] = incidencias.splice(indice, 1);
  guardarIncidencias(incidencias);
  return eliminada;
}
