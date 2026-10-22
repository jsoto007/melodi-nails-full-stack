// Post-payment confirmation page (/appointments/confirmation) and the
// appointment time picker used in the booking flow.
export default {
  en: {
    eyebrow: {
      booked: 'Booked',
      processing: 'Processing',
      failed: 'Payment issue',
    },
    title: {
      confirmed: 'Appointment confirmed',
      processing: 'Payment still processing',
      failed: 'Payment was not completed',
    },
    description: {
      confirmed:
        'Thanks for booking your appointment. We emailed you a confirmation with calendar options. Check your inbox or spam folder.',
      processing:
        'Your time is on a temporary hold while your payment finishes processing. We will confirm the appointment as soon as the payment goes through.',
      failed:
        'Your payment was not completed, so this appointment was not booked. Start a new booking to reserve a time.',
    },
    help: {
      processing:
        'Keep this page open for a moment while we verify your payment. If the payment does not go through, the temporary hold will expire and the appointment will not be booked.',
      failedBefore:
        'If your card was charged but this page still shows the payment as not completed, email us at ',
      failedAfter: ' with your reference code and we will sort it out.',
      confirmedBefore: 'If you don’t see the email, check your spam or promotions folder and look for a message from ',
      confirmedAfter: '. The confirmation includes Google and Apple calendar options so you can save the time.',
    },
    labels: {
      reference: 'Reference',
      bookedFor: 'Booked for',
      bookedForName: 'Booked for {name}',
      date: 'Date',
      startTime: 'Start time',
      length: 'Appointment length',
      studio: 'Salon',
      nailTech: 'Nail tech',
      payment: 'Payment',
      phone: 'Phone',
      details: 'Appointment details',
      clientNotes: 'Your notes',
      alsoIn: 'Also in {category}',
    },
    secondary: {
      arriveEarly: 'Please arrive 10 minutes early to check in.',
      emailOnceConfirmed: 'We will email you once the time is confirmed.',
      timeZone: 'Eastern Time (ET)',
      schedulingInProgress: 'Scheduling in progress',
      suggested: 'Suggested: {duration}',
      phoneNote: 'Your confirmation email has everything you need.',
    },
    fallbacks: {
      pending: 'Pending',
      pendingScheduling: 'Pending scheduling',
      toBeConfirmed: 'To be confirmed',
      guestBooking: 'Guest booking',
      servicePending: 'Service pending',
      assignedShortly: 'Assigned shortly',
      captured: 'Captured during booking',
      recorded: 'Recorded',
    },
    paymentStatus: {
      paid: 'Paid',
      succeeded: 'Paid',
      pending: 'Pending',
      processing: 'Processing',
      requires_payment_method: 'Payment needed',
      requires_action: 'Action needed',
      failed: 'Failed',
      canceled: 'Canceled',
      cancelled: 'Canceled',
      expired: 'Expired',
      refunded: 'Refunded',
      partially_refunded: 'Partially refunded',
    },
    duration: {
      hours: ({ count }) => (count === 1 ? '1 hour' : `${count} hours`),
      minutes: ({ count }) => (count === 1 ? '1 minute' : `${count} minutes`),
    },
    actions: {
      viewReceipt: 'View receipt',
      viewMap: 'View map',
      directions: 'Get directions',
      emailStudio: 'Email the salon',
      returnHome: 'Return home',
      dashboard: 'View dashboard',
      bookAnother: 'Book another appointment',
      startBooking: 'Start a booking',
      backHome: 'Back to home',
      book: 'Book',
    },
    loading: {
      title: 'Retrieving your booking details…',
      hint: 'The reference code and email address from your confirmation email will also open this page.',
    },
    notFound: {
      message:
        'We couldn’t find booking details for this visit. Try refreshing the page or use the link in your confirmation email.',
      hint: 'You can view your full booking details any time, without signing in, using the reference code and email address from your confirmation email.',
    },
    errors: {
      verifyPayment:
        'We could not verify your payment right now. Please refresh the page in a moment or check your email for a confirmation.',
      loadAppointment:
        'We could not load your appointment details. Check the reference code and email address and try again.',
    },
    appointmentTypeFallback: 'Nail appointment',
    timePicker: {
      periods: {
        morning: 'Morning',
        afternoon: 'Afternoon',
        evening: 'Evening',
      },
      pickDay: 'Pick a day',
      laterDate: 'Need a later date?',
      pickTime: 'Pick a time',
      today: 'Today',
      selectServiceFirst: 'Select at least one service above to see available times',
      loadingTimes: 'Loading available times',
      closed: 'The salon is closed on this date.',
      noTimes: 'No times left on this date.',
      nextDay: 'Try the next day →',
      selected: 'Selected {time}',
      open: ({ count }) => `${count} open`,
    },
  },
  es: {
    eyebrow: {
      booked: 'Reservada',
      processing: 'Procesando',
      failed: 'Problema con el pago',
    },
    title: {
      confirmed: 'Cita confirmada',
      processing: 'El pago aún se está procesando',
      failed: 'El pago no se completó',
    },
    description: {
      confirmed:
        'Gracias por reservar tu cita. Te enviamos un correo de confirmación con opciones para agregarla a tu calendario. Revisa tu bandeja de entrada o la carpeta de spam.',
      processing:
        'Tu horario está reservado temporalmente mientras termina de procesarse el pago. Confirmaremos la cita en cuanto se complete el pago.',
      failed:
        'Tu pago no se completó, así que esta cita no quedó reservada. Inicia una nueva reserva para apartar un horario.',
    },
    help: {
      processing:
        'Mantén esta página abierta un momento mientras verificamos tu pago. Si el pago no se completa, la reserva temporal vencerá y la cita no quedará agendada.',
      failedBefore:
        'Si se hizo el cargo a tu tarjeta pero esta página sigue mostrando que el pago no se completó, escríbenos a ',
      failedAfter: ' con tu código de referencia y lo resolveremos.',
      confirmedBefore: 'Si no ves el correo, revisa la carpeta de spam o promociones y busca un mensaje de ',
      confirmedAfter: '. La confirmación incluye opciones para Google Calendar y Apple Calendar para que guardes el horario.',
    },
    labels: {
      reference: 'Referencia',
      bookedFor: 'Reserva a nombre de',
      bookedForName: 'Reserva a nombre de {name}',
      date: 'Fecha',
      startTime: 'Hora de inicio',
      length: 'Duración de la cita',
      studio: 'Salón',
      nailTech: 'Técnica de uñas',
      payment: 'Pago',
      phone: 'Teléfono',
      details: 'Detalles de la cita',
      clientNotes: 'Tus notas',
      alsoIn: 'También en {category}',
    },
    secondary: {
      arriveEarly: 'Llega 10 minutos antes para registrarte.',
      emailOnceConfirmed: 'Te escribiremos por correo cuando se confirme el horario.',
      timeZone: 'Hora del Este (ET)',
      schedulingInProgress: 'Programación en curso',
      suggested: 'Sugerida: {duration}',
      phoneNote: 'Tu correo de confirmación tiene todo lo que necesitas.',
    },
    fallbacks: {
      pending: 'Pendiente',
      pendingScheduling: 'Pendiente de programar',
      toBeConfirmed: 'Por confirmar',
      guestBooking: 'Reserva sin cuenta',
      servicePending: 'Servicio pendiente',
      assignedShortly: 'Se asignará pronto',
      captured: 'Registrado durante la reserva',
      recorded: 'Registrado',
    },
    paymentStatus: {
      paid: 'Pagado',
      succeeded: 'Pagado',
      pending: 'Pendiente',
      processing: 'Procesando',
      requires_payment_method: 'Falta el pago',
      requires_action: 'Requiere acción',
      failed: 'Fallido',
      canceled: 'Cancelado',
      cancelled: 'Cancelado',
      expired: 'Vencido',
      refunded: 'Reembolsado',
      partially_refunded: 'Reembolsado parcialmente',
    },
    duration: {
      hours: ({ count }) => (count === 1 ? '1 hora' : `${count} horas`),
      minutes: ({ count }) => (count === 1 ? '1 minuto' : `${count} minutos`),
    },
    actions: {
      viewReceipt: 'Ver recibo',
      viewMap: 'Ver mapa',
      directions: 'Cómo llegar',
      emailStudio: 'Escribir al salón',
      returnHome: 'Volver al inicio',
      dashboard: 'Ver mi panel',
      bookAnother: 'Reservar otra cita',
      startBooking: 'Iniciar una reserva',
      backHome: 'Volver al inicio',
      book: 'Reservar',
    },
    loading: {
      title: 'Cargando los detalles de tu reserva…',
      hint: 'El código de referencia y el correo electrónico de tu correo de confirmación también abren esta página.',
    },
    notFound: {
      message:
        'No encontramos los detalles de esta reserva. Intenta actualizar la página o usa el enlace de tu correo de confirmación.',
      hint: 'Puedes ver todos los detalles de tu reserva en cualquier momento, sin iniciar sesión, con el código de referencia y el correo electrónico de tu confirmación.',
    },
    errors: {
      verifyPayment:
        'No pudimos verificar tu pago en este momento. Actualiza la página en un momento o revisa tu correo para ver la confirmación.',
      loadAppointment:
        'No pudimos cargar los detalles de tu cita. Revisa el código de referencia y el correo electrónico e inténtalo de nuevo.',
    },
    appointmentTypeFallback: 'Cita de uñas',
    timePicker: {
      periods: {
        morning: 'Mañana',
        afternoon: 'Tarde',
        evening: 'Noche',
      },
      pickDay: 'Elige un día',
      laterDate: '¿Necesitas una fecha más adelante?',
      pickTime: 'Elige una hora',
      today: 'Hoy',
      selectServiceFirst: 'Selecciona al menos un servicio arriba para ver los horarios disponibles',
      loadingTimes: 'Cargando horarios disponibles',
      closed: 'El salón está cerrado en esta fecha.',
      noTimes: 'No quedan horarios en esta fecha.',
      nextDay: 'Prueba el día siguiente →',
      selected: 'Seleccionada: {time}',
      open: ({ count }) => (count === 1 ? '1 disponible' : `${count} disponibles`),
    },
  },
};
