// 20 incidencias de demostración, de la más antigua a la más reciente.
// Las fechas se calculan hacia atrás desde "ahora", para que la demo publicada siempre se vea actual.
// No llevan id: storage.js los asigna con el correlativo, igual que a una incidencia nueva.

const HORA = 60 * 60 * 1000;

// [titulo, descripcion, categoria, prioridad, estado, responsable, horas desde el registro, horas hasta la última actualización]
const PLANTILLAS = [
  ['Monitor parpadea en estación de diseño', 'El monitor secundario del puesto 14 parpadea cada pocos segundos. Se probó otro cable HDMI y el problema continúa.', 'Hardware', 'Baja', 'Resuelta', 'Diego Flores', 1080, 26],
  ['No se instala la actualización acumulada de Windows', 'La actualización de seguridad falla con el código 0x800f0922 en tres equipos del área de compras.', 'Software', 'Media', 'Resuelta', 'Carlos Ramírez', 1010, 30],
  ['La VPN se desconecta cada 10 minutos', 'Los usuarios que trabajan desde casa pierden la conexión VPN de forma periódica y deben volver a autenticarse.', 'Red', 'Alta', 'Resuelta', 'Jorge Sánchez', 915, 20],
  ['Usuario bloqueado tras varios intentos fallidos', 'La cuenta de la asistente de gerencia quedó bloqueada. Solicita restablecer la contraseña para ingresar al dominio.', 'Accesos', 'Media', 'Resuelta', 'Lucía Mendoza', 842, 2],
  ['Correos rebotan al enviar a un proveedor', 'Los mensajes enviados al dominio del proveedor de logística regresan con el error 550 5.7.1 de rechazo por SPF.', 'Correo', 'Alta', 'Resuelta', 'Ana Gutiérrez', 750, 48],
  ['Teclado con teclas que no responden', 'Las teclas A, S y D del teclado del puesto de recepción no responden. El equipo está en garantía.', 'Hardware', 'Baja', 'Resuelta', 'Diego Flores', 676, 72],
  ['El ERP muestra un error al generar el reporte mensual', 'Al generar el reporte de cierre mensual, el ERP muestra "Timeout de consulta" y el reporte no se descarga. Afecta al cierre contable.', 'Software', 'Crítica', 'Resuelta', 'Carlos Ramírez', 604, 6],
  ['Wi-Fi lento en la sala de reuniones', 'Durante las videollamadas en la sala de reuniones principal la conexión inalámbrica cae por debajo de 2 Mbps.', 'Red', 'Media', 'En proceso', 'Jorge Sánchez', 508, 120],
  ['Acceso a la carpeta compartida de Finanzas', 'El nuevo analista financiero necesita permisos de lectura y escritura en la carpeta compartida de presupuestos.', 'Accesos', 'Baja', 'Pendiente', 'Lucía Mendoza', 455, 0],
  ['El proyector del auditorio no detecta la laptop', 'El proyector no reconoce la señal por HDMI ni por USB-C. Se requiere para la capacitación del viernes.', 'Hardware', 'Media', 'En proceso', 'Diego Flores', 386, 24],
  ['Buzón de correo lleno impide recibir mensajes', 'El buzón compartido de atención al cliente alcanzó su límite de 50 GB y los correos entrantes están siendo rechazados.', 'Correo', 'Media', 'Pendiente', 'Ana Gutiérrez', 334, 0],
  ['El antivirus detecta un archivo sospechoso', 'El antivirus puso en cuarentena un adjunto en un equipo de contabilidad. Se requiere analizar el equipo y confirmar que no hay infección.', 'Software', 'Alta', 'En proceso', 'Carlos Ramírez', 290, 3],
  ['Cambio de ubicación de puesto de trabajo', 'Trasladar el equipo, el teléfono IP y el monitor del puesto 22 al puesto 31 del mismo piso.', 'Otro', 'Baja', 'Pendiente', 'Jorge Sánchez', 238, 0],
  ['El switch del segundo piso se reinicia solo', 'El switch principal del segundo piso se reinicia varias veces al día y deja sin red a todo el piso durante unos minutos.', 'Red', 'Crítica', 'En proceso', 'Jorge Sánchez', 190, 4],
  ['Licencia de Office vencida en dos equipos de ventas', 'Word y Excel abren en modo de solo lectura en dos laptops del equipo de ventas por licencia vencida.', 'Software', 'Alta', 'En proceso', 'Carlos Ramírez', 166, 10],
  ['Outlook no sincroniza el calendario compartido', 'El calendario compartido de la gerencia no muestra las reuniones nuevas en Outlook de escritorio, pero sí en la versión web.', 'Correo', 'Media', 'Pendiente', 'Ana Gutiérrez', 118, 0],
  ['La impresora de recepción atasca el papel', 'La impresora multifuncional de recepción atasca el papel en la bandeja 2 en casi todas las impresiones a doble cara.', 'Hardware', 'Media', 'En proceso', 'Diego Flores', 92, 5],
  ['Usuario nuevo sin acceso al sistema contable', 'La contadora que ingresó el lunes aún no tiene usuario en el sistema contable y no puede registrar asientos.', 'Accesos', 'Alta', 'Pendiente', 'Lucía Mendoza', 66, 0],
  ['Solicitud de mouse ergonómico', 'Un colaborador del área legal solicita un mouse ergonómico por indicación del médico ocupacional.', 'Otro', 'Baja', 'Pendiente', 'Diego Flores', 30, 0],
  ['El servidor de archivos no responde', 'Desde las 8:00 a. m. no se puede acceder a las unidades de red mapeadas. Afecta a todas las áreas de la oficina.', 'Red', 'Crítica', 'Pendiente', 'Carlos Ramírez', 2, 0],
];

/**
 * Devuelve las 20 incidencias de demostración, sin id.
 * @param {Date} [ahora] Fecha de referencia para calcular las fechas.
 */
export function crearDatosDemo(ahora = new Date()) {
  return PLANTILLAS.map(([titulo, descripcion, categoria, prioridad, estado, responsable, horasAtras, horasAtencion]) => {
    const registro = new Date(ahora.getTime() - horasAtras * HORA);
    // Nunca en el futuro: una incidencia reciente no puede haberse actualizado después de "ahora".
    const actualizacion = new Date(Math.min(registro.getTime() + horasAtencion * HORA, ahora.getTime()));
    return {
      titulo,
      descripcion,
      categoria,
      prioridad,
      estado,
      responsable,
      fechaRegistro: registro.toISOString(),
      fechaActualizacion: actualizacion.toISOString(),
    };
  });
}
