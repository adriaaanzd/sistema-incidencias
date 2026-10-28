// Catálogos y constantes de la aplicación. Es la única fuente de estos valores:
// formularios, filtros, validación y gráficos los leen desde aquí.

export const CATEGORIAS = Object.freeze(['Hardware', 'Software', 'Red', 'Accesos', 'Correo', 'Otro']);

// En orden de menor a mayor urgencia (los gráficos respetan este orden).
export const PRIORIDADES = Object.freeze(['Baja', 'Media', 'Alta', 'Crítica']);

// En el orden del flujo de trabajo.
export const ESTADOS = Object.freeze(['Pendiente', 'En proceso', 'Resuelta']);

// Límites de longitud de los campos de texto (después de quitar espacios al inicio y al final).
export const LIMITES = Object.freeze({
  titulo: Object.freeze({ min: 5, max: 100 }),
  descripcion: Object.freeze({ min: 10, max: 1000 }),
  responsable: Object.freeze({ min: 3, max: 60 }),
});

// Claves de localStorage. El prefijo evita choques con otras apps servidas desde el mismo origen
// (en GitHub Pages, todos los repositorios de un usuario comparten usuario.github.io).
export const CLAVES = Object.freeze({
  incidencias: 'incidencias-ti:incidencias',
  correlativo: 'incidencias-ti:correlativo',
});

export const PREFIJO_ID = 'INC';
