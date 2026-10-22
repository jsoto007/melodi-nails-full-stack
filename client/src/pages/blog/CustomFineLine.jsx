import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function CustomFineLine() {
  const { isSpanish } = useLanguage();
  const copy = isSpanish
    ? {
        eyebrow: 'Detrás del set',
        title: 'Cómo se crea un set exclusivo en Melodi Nails',
        intro:
          'Un set exclusivo es mucho más que esmalte y color. En Melodi Nails, el proceso se construye alrededor de preparación, estructura, forma y acabado para que el resultado se vea intencional, favorecedor y duradero.',
        sections: [
          {
            title: 'Consulta y visión creativa',
            body:
              'Cada set comienza con una conversación sobre forma, color, acabado, largo y estilo de vida. Algunas clientas buscan un manicure limpio para todos los días, mientras otras quieren algo más atrevido o con más diseño. Las fotos de inspiración ayudan, pero la idea siempre es adaptar el look a la clienta.',
          },
          {
            title: 'Planificación y preparación',
            body:
              'Los mejores resultados comienzan con una buena preparación. Eso incluye cuidado de cutícula, forma, refinamiento de la superficie y selección del servicio correcto, ya sea manicure natural, gel overlay o estructura completa en acrílico.',
          },
          {
            title: 'Aplicación precisa y acabado',
            body:
              'Cuando la base está lista, la aplicación se enfoca en simetría, estructura y limpieza. El producto se coloca con atención al equilibrio y la durabilidad, y luego se perfecciona para que el set se vea pulido desde cualquier ángulo.',
          },
          {
            title: 'Detalle y nail art',
            body:
              'Si el set incluye francés, chrome, piedras, líneas o nail art personalizado, esos detalles llegan después de tener una estructura limpia. Los mejores diseños siempre dependen de una base fuerte.',
          },
          {
            title: 'Cuidado y duración',
            body:
              'La duración no depende solo del producto. También depende del cuidado posterior, de los hábitos diarios y de que el mantenimiento se haga a tiempo. Aceite para cutícula, guantes y rellenos puntuales ayudan muchísimo.',
          },
          {
            title: 'Una experiencia personalizada',
            body:
              'Melodi Nails está construido alrededor del detalle, el cuidado y la constancia. Eso significa un servicio personal, un proceso sin prisa y uñas terminadas que se mantienen hermosas entre visitas.',
          },
        ],
      }
    : {
        eyebrow: 'Behind the set',
        title: 'How a Signature Nail Set Comes to Life at Melodi Nails',
        intro:
          'A signature nail set is more than polish and color. At Melodi Nails, the process is built around prep, structure, shaping, and finish so the final look feels intentional, flattering, and wearable beyond the day of the appointment.',
        sections: [
          {
            title: 'Consultation and Creative Vision',
            body:
              'Every set starts with a conversation about shape, color, finish, length, and lifestyle. Some clients want a clean everyday manicure, while others want something bolder, longer, or more design-driven. Inspiration images help, but the goal is always to adapt the look to the client instead of copying blindly.',
          },
          {
            title: 'Design Planning and Preparation',
            body:
              "Strong results start with prep. That includes cuticle care, shaping, refining the nail surface, and selecting the right service for the client's goal, whether that means a natural manicure, gel overlay, or full acrylic structure. Good prep is what makes the finished nails look cleaner and wear better.",
          },
          {
            title: 'Precision Application and Finishing',
            body:
              'Once the base is ready, the application stage is about symmetry, structure, and clean finishing. Product is placed with attention to balance and durability, then refined through filing, smoothing, and top-coat work so the set looks polished from every angle.',
          },
          {
            title: 'Detail Work and Nail Art',
            body:
              'If the set includes French tips, chrome, gems, line work, or custom nail art, those details come after the structure is clean. The best designs still depend on a strong foundation. Nail art looks better when the base shape, cuticle area, and finish are already precise.',
          },
          {
            title: 'Aftercare and Longevity',
            body:
              'Longevity does not come from product alone. It also depends on aftercare, daily habits, and how consistently maintenance is scheduled. Cuticle oil, gloves for chores, and timely fills can help keep the service looking polished while reducing unnecessary lifting or breakage.',
          },
          {
            title: 'A Personalized Salón Experience',
            body:
              "Melodi Nails is built around detail, care, and consistency. The goal is not just a beautiful result on the day of the appointment, but a set that fits the client's style, routine, and maintenance preferences.",
          },
        ],
      };
  return (
    <article className="space-y-10 text-base leading-relaxed text-gray-600">
      <header>
        <p className="tracking-[0.3em] text-xs font-semibold uppercase text-gray-500">
          {copy.eyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-semibold tracking-tight text-gray-900">
          {copy.title}
        </h1>
        <p className="mt-4 text-base text-gray-600">
          {copy.intro}
        </p>
      </header>

      {copy.sections.map((section, index) => (
        <section key={section.title} className="space-y-4">
          <h2 className="text-2xl font-semibold text-gray-900">{section.title}</h2>
          <p>{section.body}</p>
          {index === copy.sections.length - 1 && !isSpanish ? (
            <p>
              For clients looking for a nail salon in the Bronx, that means a service that feels personal, a process
              that is never rushed, and finished nails that hold up beautifully between visits.
            </p>
          ) : null}
        </section>
      ))}
    </article>
  );
}
