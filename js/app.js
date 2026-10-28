// Arranque de la aplicación: carga los datos, decide qué mostrar y redibuja cuando los datos cambian.

import { CLAVES, EVENTO_CAMBIO } from './config.js';
import { cargarIncidencias, inicializar, restablecerDemo } from './storage.js';
import { renderDashboard } from './dashboard.js';
import { confirmar, mostrarToast } from './ui.js';

const aviso = document.getElementById('aviso-datos');
const avisoTitulo = document.getElementById('aviso-datos-titulo');
const avisoTexto = document.getElementById('aviso-datos-texto');
const avisoDetalle = document.getElementById('aviso-datos-detalle');
const botonRestablecerAviso = document.getElementById('btn-restablecer-aviso');
const vistaDashboard = document.getElementById('vista-dashboard');

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

function mostrarAviso({ estado, detalle }) {
  const { titulo, texto, puedeRestablecer } = AVISOS[estado];
  avisoTitulo.textContent = titulo;
  avisoTexto.textContent = texto;
  avisoDetalle.textContent = detalle ? `Detalle técnico: ${detalle}` : '';
  botonRestablecerAviso.hidden = !puedeRestablecer;
  aviso.hidden = false;
  vistaDashboard.hidden = true;
}

function refrescar(resultado = cargarIncidencias()) {
  if (resultado.estado === 'corrupto' || resultado.estado === 'no-disponible') {
    mostrarAviso(resultado);
    return;
  }
  aviso.hidden = true;
  vistaDashboard.hidden = false;
  renderDashboard(resultado.incidencias);
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
botonRestablecerAviso.addEventListener('click', restablecer);
