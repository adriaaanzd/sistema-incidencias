// Vista Dashboard: indicadores, gráficos por prioridad y por estado, y últimas incidencias.
// Recibe el arreglo de incidencias; no lee localStorage por su cuenta (eso lo hace app.js).

import { ESTADOS, PRIORIDADES } from './config.js';
import { crearBadgeEstado, crearBadgePrioridad, crearElemento, formatearFecha } from './ui.js';

const CANTIDAD_ULTIMAS = 5;

// Colores tomados de las variables CSS, para que gráficos y badges usen la misma paleta.
const variableCss = (nombre) => getComputedStyle(document.documentElement).getPropertyValue(nombre).trim();
const COLORES_PRIORIDAD = ['baja', 'media', 'alta', 'critica'].map((p) => `--prioridad-${p}-texto`);
const COLORES_ESTADO = ['pendiente', 'proceso', 'resuelta'].map((e) => `--estado-${e}-texto`);

const graficos = { prioridad: null, estado: null };

/** Cuenta cuántas incidencias hay de cada valor del catálogo, en el orden del catálogo. */
function contarPor(incidencias, campo, catalogo) {
  return catalogo.map((valor) => incidencias.filter((i) => i[campo] === valor).length);
}

function pintarIndicadores(incidencias) {
  const [pendientes, enProceso, resueltas] = contarPor(incidencias, 'estado', ESTADOS);
  document.getElementById('kpi-total').textContent = incidencias.length;
  document.getElementById('kpi-pendientes').textContent = pendientes;
  document.getElementById('kpi-proceso').textContent = enProceso;
  document.getElementById('kpi-resueltas').textContent = resueltas;
}

/**
 * Crea el gráfico la primera vez y, en las siguientes, solo cambia los datos: Chart.js anima la transición
 * y no se acumulan instancias sobre el mismo canvas.
 */
function pintarGrafico(clave, canvasId, configuracion, etiquetas, valores, nombre) {
  const canvas = document.getElementById(canvasId);
  const contenedor = canvas.parentElement;
  const total = valores.reduce((a, b) => a + b, 0);

  // Un canvas es una imagen para un lector de pantalla: el resumen va en texto.
  const resumen = etiquetas.map((e, i) => `${e}: ${valores[i]}`).join(', ');
  canvas.setAttribute('aria-label', `${nombre}. ${resumen}.`);

  // Sin incidencias, un gráfico de ceros no dice nada: se muestra el recuadro con un aviso.
  contenedor.classList.toggle('grafico-pendiente', total === 0);
  contenedor.querySelector('.grafico-aviso').textContent = 'Sin incidencias registradas';

  if (graficos[clave]) {
    graficos[clave].data.datasets[0].data = valores;
    graficos[clave].update();
  } else {
    graficos[clave] = new Chart(canvas, configuracion(etiquetas, valores));
  }
}

const configuracionPrioridad = (etiquetas, valores) => ({
  type: 'bar',
  data: {
    labels: etiquetas,
    datasets: [{
      label: 'Incidencias',
      data: valores,
      backgroundColor: COLORES_PRIORIDAD.map(variableCss),
      borderRadius: 6,
      maxBarThickness: 56,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, ticks: { precision: 0 } },
    },
  },
});

const configuracionEstado = (etiquetas, valores) => ({
  type: 'doughnut',
  data: {
    labels: etiquetas,
    datasets: [{
      data: valores,
      backgroundColor: COLORES_ESTADO.map(variableCss),
      borderColor: variableCss('--color-superficie'),
      borderWidth: 3,
    }],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } },
  },
});

function crearItemUltima(incidencia) {
  return crearElemento('li', { clase: 'lista-item' },
    crearElemento('div', { clase: 'lista-principal' },
      crearElemento('span', { clase: 'lista-id', texto: incidencia.id }),
      crearElemento('span', { clase: 'lista-titulo', texto: incidencia.titulo }),
      crearElemento('span', {
        clase: 'lista-meta',
        texto: `${incidencia.categoria} · ${incidencia.responsable} · ${formatearFecha(incidencia.fechaRegistro)}`,
      })),
    crearElemento('div', { clase: 'lista-badges' },
      crearBadgePrioridad(incidencia.prioridad),
      crearBadgeEstado(incidencia.estado)));
}

function pintarUltimas(incidencias) {
  const lista = document.getElementById('lista-ultimas');
  const ultimas = [...incidencias]
    .sort((a, b) => b.fechaRegistro.localeCompare(a.fechaRegistro))
    .slice(0, CANTIDAD_ULTIMAS);

  if (ultimas.length === 0) {
    lista.replaceChildren(crearElemento('li', { clase: 'lista-item lista-vacia', texto: 'Aún no hay incidencias registradas.' }));
    return;
  }
  lista.replaceChildren(...ultimas.map(crearItemUltima));
}

/** Dibuja (o actualiza) todo el dashboard con las incidencias recibidas. */
export function renderDashboard(incidencias) {
  pintarIndicadores(incidencias);
  pintarGrafico('prioridad', 'grafico-prioridad', configuracionPrioridad, PRIORIDADES,
    contarPor(incidencias, 'prioridad', PRIORIDADES), 'Incidencias por prioridad');
  pintarGrafico('estado', 'grafico-estado', configuracionEstado, ESTADOS,
    contarPor(incidencias, 'estado', ESTADOS), 'Incidencias por estado');
  pintarUltimas(incidencias);
}
