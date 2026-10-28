// Utilidades de interfaz compartidas por las vistas.
// Regla de seguridad: el texto variable (sobre todo el que escribe el usuario) se asigna siempre
// con textContent, nunca con innerHTML. Así "<img src=x onerror=...>" se muestra como texto.
// Depende de window.bootstrap (bootstrap.bundle.min.js se carga antes que los módulos).

import { LOCALE } from './config.js';

/**
 * Crea un elemento DOM.
 * @param {string} etiqueta
 * @param {{ clase?: string, texto?: string, atributos?: Record<string, string> }} [opciones]
 * @param {...Node} hijos
 */
export function crearElemento(etiqueta, { clase, texto, atributos } = {}, ...hijos) {
  const elemento = document.createElement(etiqueta);
  if (clase) elemento.className = clase;
  if (texto !== undefined) elemento.textContent = texto;
  for (const [nombre, valor] of Object.entries(atributos ?? {})) elemento.setAttribute(nombre, valor);
  elemento.append(...hijos);
  return elemento;
}

/** Icono de Bootstrap Icons decorativo (oculto para lectores de pantalla). */
export const crearIcono = (nombre, clase = '') =>
  crearElemento('i', { clase: `bi bi-${nombre} ${clase}`.trim(), atributos: { 'aria-hidden': 'true' } });

// Valor del catálogo → sufijo de la clase CSS del badge (ver styles.css).
const CLASE_PRIORIDAD = { Baja: 'baja', Media: 'media', Alta: 'alta', Crítica: 'critica' };
const CLASE_ESTADO = { Pendiente: 'pendiente', 'En proceso': 'proceso', Resuelta: 'resuelta' };

export const crearBadgePrioridad = (prioridad) =>
  crearElemento('span', { clase: `badge badge-prioridad-${CLASE_PRIORIDAD[prioridad]}`, texto: prioridad });

export const crearBadgeEstado = (estado) =>
  crearElemento('span', { clase: `badge badge-estado-${CLASE_ESTADO[estado]}`, texto: estado });

/** "2026-10-27T15:30:00.000Z" → "27 oct. 2026" (en la hora local del navegador). */
export const formatearFecha = (iso) =>
  new Date(iso).toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });

/** "2026-10-27T15:30:00.000Z" → "27 oct. 2026, 10:30 a. m." */
export const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString(LOCALE, { dateStyle: 'medium', timeStyle: 'short' });

// ===== Toasts =====

const TOASTS = {
  success: { icono: 'check-circle-fill', fondo: 'text-bg-success' },
  danger: { icono: 'x-circle-fill', fondo: 'text-bg-danger' },
  warning: { icono: 'exclamation-triangle-fill', fondo: 'text-bg-warning' },
  info: { icono: 'info-circle-fill', fondo: 'text-bg-primary' },
};

/**
 * Muestra un toast de Bootstrap en la esquina superior derecha.
 * @param {string} mensaje
 * @param {'success'|'danger'|'warning'|'info'} [tipo]
 */
export function mostrarToast(mensaje, tipo = 'success') {
  let contenedor = document.getElementById('toasts');
  if (!contenedor) {
    contenedor = crearElemento('div', { clase: 'toast-container position-fixed top-0 end-0 p-3', atributos: { id: 'toasts' } });
    document.body.append(contenedor);
  }

  const { icono, fondo } = TOASTS[tipo];
  const esError = tipo === 'danger';
  const cerrar = crearElemento('button', {
    clase: `btn-close${tipo === 'warning' ? '' : ' btn-close-white'} me-2 m-auto`,
    atributos: { type: 'button', 'data-bs-dismiss': 'toast', 'aria-label': 'Cerrar' },
  });
  const toast = crearElemento('div', {
    clase: `toast align-items-center border-0 ${fondo}`,
    atributos: { role: esError ? 'alert' : 'status', 'aria-live': esError ? 'assertive' : 'polite', 'aria-atomic': 'true' },
  }, crearElemento('div', { clase: 'd-flex' },
    crearElemento('div', { clase: 'toast-body' }, crearIcono(icono, 'me-2'), mensaje),
    cerrar));

  contenedor.append(toast);
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
  bootstrap.Toast.getOrCreateInstance(toast, { delay: esError ? 7000 : 4000 }).show();
}

// ===== Confirmación =====

/**
 * Pide confirmación con un modal de Bootstrap. Resuelve true solo si se pulsa el botón de confirmar.
 * @returns {Promise<boolean>}
 */
export function confirmar(mensaje, { titulo = 'Confirmar acción', textoBoton = 'Eliminar', claseBoton = 'btn-danger' } = {}) {
  return new Promise((resolve) => {
    const botonConfirmar = crearElemento('button', { clase: `btn ${claseBoton}`, texto: textoBoton, atributos: { type: 'button' } });
    const elemento = crearElemento('div', {
      clase: 'modal fade',
      atributos: { tabindex: '-1', 'aria-labelledby': 'confirmar-titulo', 'aria-hidden': 'true' },
    }, crearElemento('div', { clase: 'modal-dialog modal-dialog-centered' },
      crearElemento('div', { clase: 'modal-content' },
        crearElemento('div', { clase: 'modal-header' },
          crearElemento('h2', { clase: 'modal-title h5', texto: titulo, atributos: { id: 'confirmar-titulo' } }),
          crearElemento('button', { clase: 'btn-close', atributos: { type: 'button', 'data-bs-dismiss': 'modal', 'aria-label': 'Cerrar' } })),
        crearElemento('div', { clase: 'modal-body', texto: mensaje }),
        crearElemento('div', { clase: 'modal-footer' },
          crearElemento('button', { clase: 'btn btn-light', texto: 'Cancelar', atributos: { type: 'button', 'data-bs-dismiss': 'modal' } }),
          botonConfirmar))));

    let aceptado = false;
    const modal = new bootstrap.Modal(elemento);
    botonConfirmar.addEventListener('click', () => {
      aceptado = true;
      modal.hide();
    });
    elemento.addEventListener('hidden.bs.modal', () => {
      modal.dispose();
      elemento.remove();
      resolve(aceptado);
    });

    document.body.append(elemento);
    modal.show();
  });
}
