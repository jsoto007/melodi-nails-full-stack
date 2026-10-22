// Blog: index, sidebar layout and the three articles. File/route names keep
// their historical "tattoo" names; the copy is all nail-salon content.
export default {
  en: {
    layout: {
      label: 'Blog',
      posts: {
        aftercare: 'Nail Aftercare Guide',
        faq: 'Nail Salon FAQ',
        signatureSet: 'How a Signature Nail Set Comes Together',
      },
    },
    index: {
      eyebrow: 'Tips & guides',
      title: 'Melodi Nails Blog',
      description:
        'We use this space to answer common salon questions, share nail care tips, and help you prepare for your next manicure, pedicure, acrylic, or gel appointment in the Bronx.',
      featured: 'Featured',
      readMore: 'Read more →',
      posts: [
        {
          title: 'Nail Aftercare Guide',
          description:
            'Simple steps to help your gel, acrylic, or natural nail service stay clean, glossy, and long-lasting.',
          to: 'aftercare',
        },
        {
          title: 'Nail Salon FAQ',
          description: 'Clear answers about booking, prep, repairs, timing, and what to expect at Melodi Nails.',
          to: 'faq',
        },
        {
          title: 'How a Signature Nail Set Comes Together',
          description:
            "A look at Melodi Nails' prep, shaping, structure, and finishing process for polished, photo-ready results.",
          to: 'custom-fine-line',
        },
      ],
    },
    signatureSet: {
      eyebrow: 'Behind the set',
      title: 'How a Signature Nail Set Comes to Life at Melodi Nails',
      intro:
        'A signature nail set is more than polish and color. At Melodi Nails, the process is built around prep, structure, shaping, and finish so the final look feels intentional, flattering, and wearable well beyond the day of your appointment.',
      sections: [
        {
          title: 'Conversation and Creative Vision',
          body:
            'Every set starts with a conversation about shape, color, finish, length, and lifestyle. Some clients want a clean everyday manicure, while others want something bolder, longer, or more design-driven. Inspiration images help, but the goal is always to adapt the look to you instead of copying it blindly.',
        },
        {
          title: 'Design Planning and Preparation',
          body:
            'Strong results start with prep. That includes cuticle care, shaping, refining the nail surface, and choosing the right service for your goal, whether that means a natural manicure, a gel overlay, or a full acrylic structure. Good prep is what makes finished nails look cleaner and wear better.',
        },
        {
          title: 'Precision Application and Finishing',
          body:
            'Once the base is ready, application is all about symmetry, structure, and clean finishing. Product is placed with attention to balance and durability, then refined through filing, smoothing, and top coat so the set looks polished from every angle.',
        },
        {
          title: 'Detail Work and Nail Art',
          body:
            'If your set includes French tips, chrome, gems, line work, or custom nail art, those details come after the structure is clean. The best designs still depend on a strong foundation: nail art looks better when the base shape, cuticle area, and finish are already precise.',
        },
        {
          title: 'Aftercare and Longevity',
          body:
            'Longevity does not come from product alone. It also depends on aftercare, daily habits, and how consistently you schedule maintenance. Cuticle oil, gloves for chores, and timely fills help keep your service looking polished while reducing lifting and breakage.',
        },
        {
          title: 'A Personalized Salon Experience',
          body:
            'Melodi Nails is built around detail, care, and consistency. The goal is not just a beautiful result on the day of your appointment, but a set that fits your style, routine, and maintenance preferences.',
        },
      ],
      closing:
        'If you are looking for a nail salon in the Bronx, that means a service that feels personal, a process that is never rushed, and finished nails that hold up beautifully between visits.',
    },
    aftercare: {
      eyebrow: 'Nail care',
      title: 'Nail Aftercare Guide',
      intro:
        'Proper nail aftercare helps your manicure, gel service, or acrylic set stay polished, comfortable, and long-lasting. A few simple habits after your appointment make a noticeable difference in shine, wear, and the overall health of your natural nails.',
      habitsTitle: 'Daily Nail Care Habits',
      habitsIntro: 'Follow these habits between appointments to keep your set looking clean and photo-ready:',
      habits: [
        'Apply cuticle oil daily to keep the nail area hydrated and avoid the dry, rough look that can make even a fresh set seem older than it is.',
        'Wear gloves for dishes, deep cleaning, and harsh products. Repeated exposure to water and chemicals can shorten wear and dull the finish.',
        'Avoid picking, biting, or peeling gel, acrylic, or lifting corners. Pulling product off at home can strip layers from your natural nail.',
        'Use your fingertips instead of your nails when opening cans, unbuckling seat belts, peeling labels, or pressing hard buttons.',
        'If a nail lifts, chips, or cracks, schedule a repair promptly. Small damage can turn into a full break if it is ignored.',
        'Rebook regularly if you wear acrylics or structured gel. Maintenance appointments preserve shape, structure, and balance as your natural nails grow out.',
      ],
      expectTitle: 'What to Expect After Your Appointment',
      expectOne:
        'A fresh set should feel smooth, secure, and balanced when you leave the salon. Over the next one to three weeks your nails will naturally grow, and everyday wear will start to show, mostly around the cuticle area and on the fingers you use most.',
      expectTwo:
        'Some wear is normal over time, but pain, unusual pressure, or fast lifting is not. If anything feels off soon after your service, reach out early so it can be fixed before the nail is damaged.',
      productsTitle: 'Recommended Products',
      products: [
        { label: 'Cuticle oil', text: 'keeps the surrounding skin soft and supports a cleaner, healthier-looking manicure.' },
        { label: 'Hand cream', text: 'keeps dry hands and cuticles from distracting from an otherwise polished set.' },
        { label: 'Protective gloves', text: 'are useful for chores and cleaning tasks that can shorten the life of your service.' },
      ],
      reachTitle: 'When to Reach Out',
      reach:
        'Reach out if you need a repair, are unsure whether to book a removal or a fill, or want help choosing the right service for your next visit. Appointments are available at the Bronx salon at 1205 College Ave.',
      emailUs: 'Email us at',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'Nail Salon Frequently Asked Questions',
      intro:
        'These are some of the questions clients ask most often before booking with Melodi Nails. They cover timing, prep, maintenance, and what to expect when you visit the salon.',
      questions: [
        {
          question: 'How long will my nail service last?',
          answer:
            'That depends on the service and your lifestyle. Natural manicures, gel polish, and acrylic sets all wear differently, but many clients come back within two to three weeks to keep everything looking clean and balanced.',
        },
        {
          question: 'When should I book a fill, refresh, or repair?',
          answer:
            'If you wear acrylics or structured sets, do not wait until several nails are lifting or breaking. Booking maintenance before the set becomes unstable usually gives a cleaner result and better protects your natural nail.',
        },
        {
          question: 'What should I do before my appointment?',
          answer:
            'Bring inspiration photos if you have a specific look in mind, and mention any removal, repairs, or detailed nail art when you book. That makes sure enough time is set aside for your appointment.',
        },
        {
          question: 'Do you work by appointment only?',
          answer:
            'Yes. Appointments allow enough time for proper prep, shaping, service selection, and finishing details without rushing. Booking ahead is also the best way to get your preferred day and time.',
        },
        {
          question: 'Can I bring an inspiration photo?',
          answer:
            'Yes. Inspiration photos help with color, shape, finish, and nail art ideas. The final set may be adjusted to suit your nail length, nail condition, and the service you booked, but reference images make working together much easier.',
        },
        {
          question: 'What if I need a full removal?',
          answer:
            'It is best to mention it before your appointment starts. Removal takes extra time, and adding it in advance helps avoid rushing the prep for your new set.',
        },
      ],
      footerBefore: 'Still have questions? Email us at',
      footerAfter: 'and we will get back to you soon.',
    },
  },
  es: {
    layout: {
      label: 'Blog',
      posts: {
        aftercare: 'Guía de cuidado de uñas',
        faq: 'Preguntas frecuentes',
        signatureSet: 'Cómo se crea un set exclusivo',
      },
    },
    index: {
      eyebrow: 'Consejos y guías',
      title: 'Blog de Melodi Nails',
      description:
        'Compartimos respuestas útiles sobre el salón, consejos de cuidado y recomendaciones para prepararte para tu próxima cita de manicura, pedicura, gel o acrílico en el Bronx.',
      featured: 'Destacado',
      readMore: 'Leer más →',
      posts: [
        {
          title: 'Guía de cuidado de uñas',
          description:
            'Pasos simples para que tu servicio en gel, acrílico o uñas naturales se mantenga limpio, brillante y duradero.',
          to: 'aftercare',
        },
        {
          title: 'Preguntas frecuentes del salón',
          description:
            'Respuestas claras sobre reservas, preparación, reparaciones, tiempos y lo que puedes esperar en Melodi Nails.',
          to: 'faq',
        },
        {
          title: 'Cómo se crea un set exclusivo',
          description:
            'Una mirada al proceso de preparación, forma, estructura y acabado de Melodi Nails para resultados pulidos y listos para foto.',
          to: 'custom-fine-line',
        },
      ],
    },
    signatureSet: {
      eyebrow: 'Detrás del set',
      title: 'Cómo se crea un set exclusivo en Melodi Nails',
      intro:
        'Un set exclusivo es mucho más que esmalte y color. En Melodi Nails, el proceso gira en torno a la preparación, la estructura, la forma y el acabado para que el resultado se vea intencional, favorecedor y duradero mucho después del día de tu cita.',
      sections: [
        {
          title: 'Conversación y visión creativa',
          body:
            'Cada set comienza con una conversación sobre forma, color, acabado, largo y estilo de vida. Algunas personas buscan una manicura limpia para todos los días, mientras que otras quieren algo más atrevido, más largo o con más diseño. Las fotos de inspiración ayudan, pero la idea siempre es adaptar el look a ti en lugar de copiarlo sin más.',
        },
        {
          title: 'Planificación y preparación',
          body:
            'Los mejores resultados comienzan con una buena preparación. Eso incluye el cuidado de la cutícula, la forma, el refinamiento de la superficie y la elección del servicio correcto para lo que buscas, ya sea una manicura natural, un recubrimiento en gel o una estructura completa en acrílico. Una buena preparación hace que las uñas se vean más limpias y duren más.',
        },
        {
          title: 'Aplicación precisa y acabado',
          body:
            'Cuando la base está lista, la aplicación se enfoca en la simetría, la estructura y un acabado limpio. El producto se coloca con atención al equilibrio y la durabilidad, y luego se perfecciona con limado, pulido y capa final para que el set se vea impecable desde cualquier ángulo.',
        },
        {
          title: 'Detalle y nail art',
          body:
            'Si tu set incluye puntas francesas, efecto cromado, piedras, líneas o nail art personalizado, esos detalles llegan después de tener una estructura limpia. Los mejores diseños siempre dependen de una base fuerte: el nail art luce mejor cuando la forma, la zona de la cutícula y el acabado ya son precisos.',
        },
        {
          title: 'Cuidado y duración',
          body:
            'La duración no depende solo del producto. También depende del cuidado posterior, de tus hábitos diarios y de que el mantenimiento se haga a tiempo. El aceite para cutícula, los guantes para las tareas de la casa y los rellenos puntuales ayudan a que tu servicio se vea pulido y a reducir levantamientos y roturas.',
        },
        {
          title: 'Una experiencia personalizada en el salón',
          body:
            'Melodi Nails gira en torno al detalle, el cuidado y la constancia. El objetivo no es solo un resultado hermoso el día de tu cita, sino un set que se adapte a tu estilo, tu rutina y tus preferencias de mantenimiento.',
        },
      ],
      closing:
        'Si buscas un salón de uñas en el Bronx, eso significa un servicio personal, un proceso sin prisas y uñas terminadas que se mantienen hermosas entre visitas.',
    },
    aftercare: {
      eyebrow: 'Cuidado de uñas',
      title: 'Guía de cuidado de uñas',
      intro:
        'El cuidado posterior ayuda a que tu manicura, servicio en gel o set de acrílico se mantenga pulido, cómodo y duradero. Unos cuantos hábitos simples después de tu cita hacen una gran diferencia en el brillo, la duración y la salud de tus uñas naturales.',
      habitsTitle: 'Hábitos diarios para cuidar tus uñas',
      habitsIntro: 'Sigue estas recomendaciones entre citas para mantener tu set limpio y listo para foto:',
      habits: [
        'Aplica aceite para cutícula todos los días para mantener hidratada la zona de la uña y evitar que el set se vea reseco antes de tiempo.',
        'Usa guantes al lavar platos, limpiar o usar productos fuertes. El agua y los químicos pueden acortar la duración del servicio y opacar el acabado.',
        'Evita morder, arrancar o despegar el gel, el acrílico o las esquinas levantadas. Quitar el producto en casa puede debilitar la uña natural.',
        'Usa las yemas de los dedos en lugar de las uñas al abrir latas, soltar el cinturón de seguridad, despegar etiquetas o presionar botones duros.',
        'Si una uña se levanta, se astilla o se agrieta, agenda una reparación lo antes posible para evitar que se rompa por completo.',
        'Reserva mantenimiento regular si usas acrílico o gel estructurado. Así se conservan la forma, la estructura y el equilibrio mientras crecen tus uñas naturales.',
      ],
      expectTitle: 'Qué esperar después de tu cita',
      expectOne:
        'Un set nuevo debe sentirse suave, seguro y equilibrado al salir del salón. Durante las siguientes una a tres semanas tus uñas crecerán de forma natural y el uso diario empezará a notarse, sobre todo cerca de la cutícula y en los dedos que más usas.',
      expectTwo:
        'Algo de desgaste es normal con el tiempo, pero el dolor, la presión inusual o un levantamiento rápido no lo son. Si algo se siente mal poco después de tu servicio, comunícate pronto para resolverlo antes de que la uña se dañe.',
      productsTitle: 'Productos recomendados',
      products: [
        { label: 'Aceite para cutícula', text: 'mantiene la piel suave y ayuda a que la manicura se vea más limpia y saludable.' },
        { label: 'Crema para manos', text: 'evita que la resequedad en manos y cutículas opaque un set pulido.' },
        { label: 'Guantes de protección', text: 'son útiles para las tareas de la casa y de limpieza que pueden acortar la vida de tu servicio.' },
      ],
      reachTitle: 'Cuándo escribirnos',
      reach:
        'Escríbenos si necesitas una reparación, si no sabes si reservar un retiro o un relleno, o si quieres ayuda para elegir tu próximo servicio. Puedes reservar tu cita en el salón del Bronx, en 1205 College Ave.',
      emailUs: 'Escríbenos a',
    },
    faq: {
      eyebrow: 'Preguntas frecuentes',
      title: 'Preguntas frecuentes del salón',
      intro:
        'Estas son algunas de las preguntas que recibimos con más frecuencia antes de reservar en Melodi Nails. Cubren tiempos, preparación, mantenimiento y lo que puedes esperar al visitar el salón.',
      questions: [
        {
          question: '¿Cuánto dura mi servicio de uñas?',
          answer:
            'Depende del servicio y de tu rutina diaria. Las manicuras naturales, el esmalte en gel y los sets de acrílico se desgastan de forma distinta, pero muchas personas regresan entre dos y tres semanas después para mantener un resultado limpio y equilibrado.',
        },
        {
          question: '¿Cuándo debo reservar un relleno, un retoque o una reparación?',
          answer:
            'Si usas acrílico o sets estructurados, no esperes a que varias uñas ya estén levantadas o rotas. Reservar el mantenimiento antes de que el set se desestabilice suele dar un resultado más limpio y protege mejor tu uña natural.',
        },
        {
          question: '¿Qué debo hacer antes de mi cita?',
          answer:
            'Trae fotos de inspiración si tienes un estilo específico en mente y, al reservar, avisa si necesitas retiro de producto, reparaciones o nail art detallado. Así nos aseguramos de reservar el tiempo correcto para tu cita.',
        },
        {
          question: '¿Trabajan solo con cita previa?',
          answer:
            'Sí. Las citas permiten dedicar el tiempo suficiente a la preparación, la forma, la elección del servicio y los detalles finales sin apresurar el proceso. Reservar con anticipación también es la mejor forma de conseguir el día y la hora que prefieres.',
        },
        {
          question: '¿Puedo llevar una foto de inspiración?',
          answer:
            'Sí. Las fotos ayudan con el color, la forma, el acabado y las ideas de nail art. El set final puede ajustarse según el largo y la condición de tus uñas y el servicio que reservaste, pero las imágenes de referencia facilitan mucho el trabajo en conjunto.',
        },
        {
          question: '¿Y si necesito un retiro completo?',
          answer:
            'Lo mejor es avisarlo antes de que empiece la cita. El retiro toma tiempo adicional y mencionarlo con anticipación ayuda a no apresurar la preparación de tu nuevo set.',
        },
      ],
      footerBefore: '¿Todavía tienes dudas? Escríbenos a',
      footerAfter: 'y te responderemos pronto.',
    },
  },
};
