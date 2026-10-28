// Arranque de la aplicación: carga los datos, navega entre vistas por el hash de la URL
// y redibuja cuando los datos cambian.

import { CLAVES, EVENTO_CAMBIO } from './config.js';
import { cargarIncidencias, inicializar, restablecerDemo } from './storage.js';
import { renderDashboard } from './dashboard.js';
import { renderIncidencias } from './vista-incidencias.js';
import { confirmar, mostrarToast } from './ui.js';

const aviso = document.getElementById('aviso-datos');
const avisoTitulo = document.getElementById('aviso-datos-titulo');
const avisoTexto = document.getElementById('aviso-datos-texto');
const avisoDetalle = document.getElementById('aviso-datos-detalle');
const botonRestablecerAviso = document.getElementById('btn-restablecer-aviso');
const sidebar = document.getElementById('sidebar');
const principal = document.getElementById('principal');

// Cada vista: su sección y los textos de la cabecera. #dashboard es la vista por defecto.
const VISTAS = {
  dashboard: {
    seccion: document.getElementById('vista-dashboard'),
    titulo: 'Dashboard',
    subtitulo: 'Resumen general de incidencias',
  },
  incidencias: {
    seccion: document.getElementById('vista-incidencias'),
    titulo: 'Incidencias',
    subtitulo: 'Registro y seguimiento de incidencias',
  },
};

const AVISOS = {
  corrupto: {
    titulo: 'Los datos guardados están dañados',
    texto: 'La información de este navegador no tiene el formato esperado, así que no se muestra para no perder nada por error. '
      + 'Puedes restablecer los datos de demostración para seguir usando la aplicación.',
    puedeRestablecer: true,
  },
  'no-disponible': {
    titulo: 'El almacenamiento local está bloqueado',
    texto: 'Este navegador no permite guardar datos para este sitio (por ejemplo, en algunos modos privados o con las cookies bloqueadas). '
      + 'Habilita el almacenamiento del sitio y recarga la página.',
    puedeRestablecer: false,
  },
};

// Con datos dañados no se muestra ninguna vista, solo el aviso.
let datosValidos = true;

const vistaActual = () => {
  const nombre = location.hash.slice(1);
  return Object.hasOwn(VISTAS, nombre) ? nombre : 'dashboard';
};

function mostrarVista() {
  const actual = vistaActual();
  for (const [nombre, vista] of Object.entries(VISTAS)) {
    vista.seccion.hidden = !datosValidos || nombre !== actual;
  }
  for (const enlace of sidebar.querySelectorAll('[data-vista]')) {
    const activo = enlace.dataset.vista === actual;
    enlace.classList.toggle('active', activo);
    if (activo) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  }
  const { titulo, subtitulo } = VISTAS[actual];
  document.getElementById('titulo-vista').textContent = titulo;
  document.getElementById('subtitulo-vista').textContent = subtitulo;
  document.title = `Incidencias TI · ${titulo}`;
}

function mostrarAviso({ estado, detalle }) {
  const { titulo, texto, puedeRestablecer } = AVISOS[estado];
  avisoTitulo.textContent = titulo;
  avisoTexto.textContent = texto;
  avisoDetalle.textContent = detalle ? `Detalle técnico: ${detalle}` : '';
  botonRestablecerAviso.hidden = !puedeRestablecer;
  aviso.hidden = false;
}

function refrescar(resultado = cargarIncidencias()) {
  datosValidos = resultado.estado !== 'corrupto' && resultado.estado !== 'no-disponible';
  if (datosValidos) {
    aviso.hidden = true;
    renderDashboard(resultado.incidencias);
    renderIncidencias(resultado.incidencias);
  } else {
    mostrarAviso(resultado);
  }
  mostrarVista();
}

async function restablecer() {
  const ok = await confirmar(
    'Se reemplazarán todas las incidencias guardadas en este navegador por las 20 de demostración. Esta acción no se puede deshacer.',
    { titulo: 'Restablecer datos demo', textoBoton: 'Restablecer', claseBoton: 'btn-primary' },
  );
  if (!ok) return;
  try {
    restablecerDemo();
    mostrarToast('Se restablecieron las 20 incidencias de demostración.');
  } catch (error) {
    mostrarToast(error.message, 'danger');
  }
}

const inicial = inicializar();
refrescar(inicial);
if (inicial.estado === 'demo') mostrarToast('Primera visita: se cargaron 20 incidencias de demostración.', 'info');

// Los listeners van después de la carga inicial para no redibujar dos veces al guardar la demo.
document.addEventListener(EVENTO_CAMBIO, () => refrescar());
// "storage" solo llega desde OTRAS pestañas del mismo origen: mantiene todas sincronizadas.
window.addEventListener('storage', (e) => {
  if (e.key === null || Object.values(CLAVES).includes(e.key)) refrescar();
});
window.addEventListener('hashchange', () => {
  mostrarVista();
  // En móvil el menú es un offcanvas: se cierra al elegir una sección.
  bootstrap.Offcanvas.getInstance(sidebar)?.hide();
  // Lleva el foco al contenido para que teclado y lectores de pantalla empiecen en la vista nueva.
  principal.focus({ preventScroll: true });
  window.scrollTo(0, 0);
});
botonRestablecerAviso.addEventListener('click', restablecer);
document.getElementById('btn-restablecer').addEventListener('click', restablecer);
