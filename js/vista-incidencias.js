// Vista Incidencias: tabla con búsqueda y filtros, cambio de estado en línea,
// formulario de registro/edición en modal y eliminación con confirmación.
// Todo el contenido variable se inserta con textContent (vía crearElemento), nunca como HTML.

import { CATEGORIAS, ESTADOS, PRIORIDADES } from './config.js';
import {
  ErrorValidacion, actualizarIncidencia, cambiarEstado, crearIncidencia, eliminarIncidencia, filtrarIncidencias,
  obtenerIncidencia, sanitizar, validar,
} from './incidencias.js';
import {
  claseEstado, confirmar, crearBadgePrioridad, crearElemento, crearIcono, formatearFecha, formatearFechaHora, mostrarToast,
} from './ui.js';

const CAMPOS = ['titulo', 'descripcion', 'categoria', 'prioridad', 'estado', 'responsable'];
const COLUMNAS = 7;

const tabla = document.getElementById('tabla-incidencias');
const contador = document.getElementById('contador-incidencias');
const resumenFiltros = document.getElementById('resumen-filtros');
const controlesFiltro = {
  texto: document.getElementById('filtro-texto'),
  prioridad: document.getElementById('filtro-prioridad'),
  estado: document.getElementById('filtro-estado'),
  categoria: document.getElementById('filtro-categoria'),
};

// Última lista recibida y filtros activos: al cambiar un filtro se redibuja sin volver a leer localStorage,
// y al cambiar los datos se conservan los filtros.
let todas = [];
const filtros = { texto: '', prioridad: '', estado: '', categoria: '' };
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

// Selector de estado en la fila: cambia el estado sin abrir el formulario.
function crearSelectorEstado(incidencia) {
  const select = crearElemento('select', {
    clase: `form-select form-select-sm select-estado ${claseEstado(incidencia.estado)}`,
    atributos: { 'data-accion': 'estado', 'data-id': incidencia.id, 'aria-label': `Estado de ${incidencia.id}` },
  }, ...ESTADOS.map((estado) => crearElemento('option', { texto: estado, atributos: { value: estado } })));
  select.value = incidencia.estado;
  return select;
}

// Las columnas ID, Responsable y Registro solo se ven desde 1400 px (y Prioridad desde 768 px).
// En pantallas menores esos datos se repiten dentro de la celda "Incidencia", así nada se pierde y la tabla cabe.
function crearCeldaIncidencia(incidencia) {
  return crearElemento('td', { clase: 'celda-titulo' },
    crearElemento('div', { clase: 'celda-id-compacta d-xxl-none', texto: incidencia.id }),
    crearElemento('div', { clase: 'fw-medium', texto: incidencia.titulo }),
    crearElemento('div', { clase: 'small text-secondary' },
      incidencia.categoria,
      crearElemento('span', {
        clase: 'd-xxl-none',
        texto: ` · ${incidencia.responsable} · ${formatearFecha(incidencia.fechaRegistro)}`,
      })),
    crearElemento('div', { clase: 'd-md-none mt-1' }, crearBadgePrioridad(incidencia.prioridad)));
}

function crearFila(incidencia) {
  return crearElemento('tr', {},
    crearElemento('td', { clase: 'text-nowrap fw-medium celda-id d-none d-xxl-table-cell', texto: incidencia.id }),
    crearCeldaIncidencia(incidencia),
    crearElemento('td', { clase: 'd-none d-md-table-cell' }, crearBadgePrioridad(incidencia.prioridad)),
    crearElemento('td', {}, crearSelectorEstado(incidencia)),
    crearElemento('td', { clase: 'd-none d-xxl-table-cell', texto: incidencia.responsable }),
    crearElemento('td', {
      clase: 'text-nowrap d-none d-xxl-table-cell',
      texto: formatearFecha(incidencia.fechaRegistro),
      atributos: { title: `Registrada: ${formatearFechaHora(incidencia.fechaRegistro)}` },
    }),
    crearElemento('td', { clase: 'text-end' },
      crearElemento('div', { clase: 'acciones' },
        crearBotonAccion('editar', 'pencil', 'btn-outline-primary', `Editar ${incidencia.id}`, incidencia.id),
        crearBotonAccion('eliminar', 'trash', 'btn-outline-danger', `Eliminar ${incidencia.id}`, incidencia.id))));
}

/** Fila de estado vacío: icono, mensaje y, si se indica, un botón con la acción que resuelve la situación. */
function filaMensaje(texto, icono, accion) {
  const contenido = crearElemento('div', { clase: 'estado-vacio' },
    crearIcono(icono, 'estado-vacio-icono'),
    crearElemento('p', { clase: 'mb-0', texto }));
  if (accion) {
    contenido.append(crearElemento('button', {
      clase: 'btn btn-sm btn-outline-primary',
      texto: accion.texto,
      atributos: { type: 'button', 'data-accion': accion.accion },
    }));
  }
  return crearElemento('tr', {}, crearElemento('td', { atributos: { colspan: String(COLUMNAS) } }, contenido));
}

const hayFiltros = () => Object.values(filtros).some((valor) => valor.trim() !== '');

function pintarTabla() {
  const visibles = filtrarIncidencias(todas, filtros);
  contador.textContent = `${todas.length} ${todas.length === 1 ? 'incidencia' : 'incidencias'}`;
  resumenFiltros.textContent = hayFiltros() ? `Mostrando ${visibles.length} de ${todas.length}.` : '';

  if (todas.length === 0) {
    tabla.replaceChildren(filaMensaje('Aún no hay incidencias registradas.', 'inbox',
      { texto: 'Registrar la primera incidencia', accion: 'nueva' }));
    return;
  }
  if (visibles.length === 0) {
    tabla.replaceChildren(filaMensaje('No hay incidencias que coincidan con la búsqueda y los filtros.', 'search',
      { texto: 'Limpiar filtros', accion: 'limpiar-filtros' }));
    return;
  }
  const ordenadas = visibles.sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro));
  tabla.replaceChildren(...ordenadas.map(crearFila));
}

/** Recibe la lista completa y dibuja la tabla aplicando la búsqueda y los filtros activos. */
export function renderIncidencias(incidencias) {
  todas = incidencias;
  pintarTabla();
}

// ===== Búsqueda y filtros =====

function llenarFiltro(select, opciones, textoTodas) {
  select.replaceChildren(
    crearElemento('option', { texto: textoTodas, atributos: { value: '' } }),
    ...opciones.map((opcion) => crearElemento('option', { texto: opcion, atributos: { value: opcion } })),
  );
}

function aplicarFiltros() {
  for (const [clave, control] of Object.entries(controlesFiltro)) filtros[clave] = control.value;
  pintarTabla();
}

function limpiarFiltros() {
  for (const control of Object.values(controlesFiltro)) control.value = '';
  aplicarFiltros();
  controlesFiltro.texto.focus();
}

// ===== Cambio de estado =====

function cambiarEstadoDesdeTabla(select) {
  const { id } = select.dataset;
  try {
    const { incidencia, cambio } = cambiarEstado(id, select.value);
    if (cambio) mostrarToast(`${incidencia.id} pasó a "${incidencia.estado}".`);
  } catch (error) {
    mostrarToast(error.message, 'danger');
    pintarTabla();
    return;
  }
  // Guardar redibuja la tabla; se devuelve el foco al selector de la misma fila para no perder el lugar con el teclado.
  // Si un filtro de estado la ocultó, el foco vuelve al buscador.
  const nuevoSelector = tabla.querySelector(`select[data-id="${CSS.escape(id)}"]`);
  (nuevoSelector ?? controlesFiltro.texto).focus();
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
// La opción vacía muestra solo el nombre del filtro: "Todas las prioridades" no cabe en columnas angostas.
llenarFiltro(controlesFiltro.prioridad, PRIORIDADES, 'Prioridad');
llenarFiltro(controlesFiltro.estado, ESTADOS, 'Estado');
llenarFiltro(controlesFiltro.categoria, CATEGORIAS, 'Categoría');

for (const control of Object.values(controlesFiltro)) control.addEventListener('input', aplicarFiltros);
document.getElementById('btn-limpiar-filtros').addEventListener('click', limpiarFiltros);
tabla.addEventListener('change', (e) => {
  if (e.target.matches('select[data-accion="estado"]')) cambiarEstadoDesdeTabla(e.target);
});

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
  const { accion, id } = boton.dataset;
  if (accion === 'editar') editar(id);
  else if (accion === 'eliminar') eliminar(id);
  else if (accion === 'limpiar-filtros') limpiarFiltros();
  else if (accion === 'nueva') abrirFormulario();
});
