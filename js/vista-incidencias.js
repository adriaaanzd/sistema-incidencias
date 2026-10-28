// Vista Incidencias: tabla, formulario de registro/edición en modal y eliminación con confirmación.
// Todo el contenido variable se inserta con textContent (vía crearElemento), nunca como HTML.

import { CATEGORIAS, ESTADOS, PRIORIDADES } from './config.js';
import {
  ErrorValidacion, actualizarIncidencia, crearIncidencia, eliminarIncidencia, obtenerIncidencia, sanitizar, validar,
} from './incidencias.js';
import {
  confirmar, crearBadgeEstado, crearBadgePrioridad, crearElemento, crearIcono, formatearFecha, formatearFechaHora, mostrarToast,
} from './ui.js';

const CAMPOS = ['titulo', 'descripcion', 'categoria', 'prioridad', 'estado', 'responsable'];
const COLUMNAS = 7;

const tabla = document.getElementById('tabla-incidencias');
const contador = document.getElementById('contador-incidencias');
const form = document.getElementById('form-incidencia');
const modalElemento = document.getElementById('modal-incidencia');
const modal = new bootstrap.Modal(modalElemento);
const tituloModal = document.getElementById('modal-incidencia-titulo');
const botonGuardar = document.getElementById('btn-guardar');

let idEditando = null;
// Hasta el primer intento de guardar no se marcan errores, para no regañar mientras el usuario empieza a escribir.
let intentoGuardar = false;

// ===== Tabla =====

function crearBotonAccion(accion, icono, clase, etiqueta, id) {
  return crearElemento('button', {
    clase: `btn btn-sm ${clase}`,
    atributos: { type: 'button', 'data-accion': accion, 'data-id': id, 'aria-label': etiqueta, title: etiqueta },
  }, crearIcono(icono));
}

function crearFila(incidencia) {
  return crearElemento('tr', {},
    crearElemento('td', { clase: 'text-nowrap fw-medium celda-id', texto: incidencia.id }),
    crearElemento('td', { clase: 'celda-titulo' },
      crearElemento('div', { clase: 'fw-medium', texto: incidencia.titulo }),
      crearElemento('div', { clase: 'small text-secondary', texto: incidencia.categoria })),
    crearElemento('td', {}, crearBadgePrioridad(incidencia.prioridad)),
    crearElemento('td', {}, crearBadgeEstado(incidencia.estado)),
    crearElemento('td', { texto: incidencia.responsable }),
    crearElemento('td', {
      clase: 'text-nowrap',
      texto: formatearFecha(incidencia.fechaRegistro),
      atributos: { title: `Registrada: ${formatearFechaHora(incidencia.fechaRegistro)}` },
    }),
    crearElemento('td', { clase: 'text-end' },
      crearElemento('div', { clase: 'acciones' },
        crearBotonAccion('editar', 'pencil', 'btn-outline-primary', `Editar ${incidencia.id}`, incidencia.id),
        crearBotonAccion('eliminar', 'trash', 'btn-outline-danger', `Eliminar ${incidencia.id}`, incidencia.id))));
}

function filaMensaje(texto) {
  return crearElemento('tr', {},
    crearElemento('td', { clase: 'text-center text-secondary py-4', texto, atributos: { colspan: String(COLUMNAS) } }));
}

/** Dibuja la tabla con todas las incidencias, de la más reciente a la más antigua. */
export function renderIncidencias(incidencias) {
  contador.textContent = `${incidencias.length} ${incidencias.length === 1 ? 'incidencia' : 'incidencias'}`;
  if (incidencias.length === 0) {
    tabla.replaceChildren(filaMensaje('Aún no hay incidencias registradas.'));
    return;
  }
  const ordenadas = [...incidencias].sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  tabla.replaceChildren(...ordenadas.map(crearFila));
}

// ===== Formulario =====

function llenarSelect(select, opciones) {
  select.replaceChildren(
    crearElemento('option', { texto: 'Seleccione…', atributos: { value: '' } }),
    ...opciones.map((opcion) => crearElemento('option', { texto: opcion, atributos: { value: opcion } })),
  );
}

const leerFormulario = () => Object.fromEntries(CAMPOS.map((campo) => [campo, form.elements[campo].value]));

/** Marca cada campo como válido o inválido con las clases de Bootstrap y escribe su mensaje. */
function mostrarErrores(errores) {
  for (const campo of CAMPOS) {
    const control = form.elements[campo];
    const mensaje = errores[campo];
    control.classList.toggle('is-invalid', Boolean(mensaje));
    control.classList.toggle('is-valid', !mensaje);
    control.setAttribute('aria-invalid', mensaje ? 'true' : 'false');
    document.getElementById(`inc-${campo}-error`).textContent = mensaje ?? '';
  }
}

function limpiarValidacion() {
  for (const campo of CAMPOS) {
    form.elements[campo].classList.remove('is-invalid', 'is-valid');
    form.elements[campo].removeAttribute('aria-invalid');
    document.getElementById(`inc-${campo}-error`).textContent = '';
  }
}

function abrirFormulario(incidencia = null) {
  form.reset();
  limpiarValidacion();
  intentoGuardar = false;
  idEditando = incidencia?.id ?? null;
  tituloModal.textContent = incidencia ? `Editar ${incidencia.id}` : 'Nueva incidencia';

  if (incidencia) {
    for (const campo of CAMPOS) form.elements[campo].value = incidencia[campo];
  } else {
    form.elements.estado.value = 'Pendiente';
  }
  modal.show();
}

async function guardar(evento) {
  evento.preventDefault();
  intentoGuardar = true;

  const datos = leerFormulario();
  const errores = validar(sanitizar(datos));
  mostrarErrores(errores);
  const primerError = CAMPOS.find((campo) => errores[campo]);
  if (primerError) {
    form.elements[primerError].focus();
    return;
  }

  botonGuardar.disabled = true;
  try {
    if (idEditando) {
      const { incidencia, cambio } = actualizarIncidencia(idEditando, datos);
      mostrarToast(cambio ? `Se actualizó ${incidencia.id}.` : 'No había cambios que guardar.', cambio ? 'success' : 'info');
    } else {
      const nueva = crearIncidencia(datos);
      mostrarToast(`Se registró ${nueva.id}.`);
    }
    modal.hide();
  } catch (error) {
    if (error instanceof ErrorValidacion) mostrarErrores(error.errores);
    else mostrarToast(error.message, 'danger');
  } finally {
    botonGuardar.disabled = false;
  }
}

// ===== Acciones de la tabla =====

function editar(id) {
  const incidencia = obtenerIncidencia(id);
  if (!incidencia) {
    mostrarToast(`La incidencia ${id} ya no existe.`, 'danger');
    return;
  }
  abrirFormulario(incidencia);
}

async function eliminar(id) {
  const incidencia = obtenerIncidencia(id);
  if (!incidencia) {
    mostrarToast(`La incidencia ${id} ya no existe.`, 'danger');
    return;
  }
  const ok = await confirmar(
    `¿Eliminar ${incidencia.id} "${incidencia.titulo}"? Esta acción no se puede deshacer.`,
    { titulo: 'Eliminar incidencia', textoBoton: 'Eliminar' },
  );
  if (!ok) return;
  try {
    eliminarIncidencia(id);
    mostrarToast(`Se eliminó ${id}.`);
  } catch (error) {
    mostrarToast(error.message, 'danger');
  }
}

// ===== Eventos =====

llenarSelect(form.elements.categoria, CATEGORIAS);
llenarSelect(form.elements.prioridad, PRIORIDADES);
llenarSelect(form.elements.estado, ESTADOS);

document.getElementById('btn-nueva').addEventListener('click', () => abrirFormulario());
form.addEventListener('submit', guardar);
// Tras el primer intento, cada cambio vuelve a validar para que el error desaparezca al corregirlo.
form.addEventListener('input', () => {
  if (intentoGuardar) mostrarErrores(validar(sanitizar(leerFormulario())));
});
modalElemento.addEventListener('shown.bs.modal', () => form.elements.titulo.focus());

// Un solo listener para todos los botones de la tabla, aunque se vuelva a dibujar.
tabla.addEventListener('click', (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;
  if (boton.dataset.accion === 'editar') editar(boton.dataset.id);
  else if (boton.dataset.accion === 'eliminar') eliminar(boton.dataset.id);
});
