import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function TattooAftercare() {
  const { isSpanish } = useLanguage();
  const copy = isSpanish
    ? {
        eyebrow: 'Cuidado',
        title: 'Guía de Cuidado de Uñas',
        intro:
          'El cuidado posterior ayuda a que tu manicure, servicio en gel o set acrílico se mantenga pulido, cómodo y duradero. Unos cuantos hábitos simples después de tu cita hacen una gran diferencia.',
        habitsTitle: 'Hábitos diarios para cuidar tus uñas',
        habitsIntro: 'Sigue estas recomendaciones entre citas para mantener tu set limpio y listo para foto:',
        habits: [
          'Aplica aceite para cutícula todos los días para mantener hidratada la zona de la uña y evitar que el set se vea reseco antes de tiempo.',
          'Usa guantes al lavar platos, limpiar o usar productos fuertes. El agua y los químicos pueden afectar la duración del servicio.',
          'Evita morder, arrancar o despegar gel, acrílico o esquinas levantadas. Quitar el producto en casa puede debilitar la uña natural.',
          'Usa las yemas de los dedos en lugar de las uñas al abrir latas, despegar etiquetas o presionar botones duros.',
          'Si una uña se levanta, se astilla o se rompe, agenda una reparación lo antes posible para evitar un daño mayor.',
          'Reserva mantenimiento regular si usas acrílico o gel estructurado. Eso ayuda a conservar forma, estructura y equilibrio.',
        ],
        expectTitle: 'Qué esperar después de tu cita',
        expectOne:
          'Un set nuevo debe sentirse suave, seguro y equilibrado al salir del salón. Durante las siguientes semanas el crecimiento natural y el uso diario empezarán a notarse, especialmente cerca de la cutícula.',
        expectTwo:
          'Algo de desgaste es normal con el tiempo, pero dolor, presión o levantamiento rápido no lo son. Si algo se siente mal, comunícate pronto para resolverlo antes de que la uña se dañe.',
        productsTitle: 'Productos recomendados',
        products: [
          { label: 'Aceite para cutícula', text: 'mantiene la piel suave y ayuda a que el manicure se vea más saludable.' },
          { label: 'Crema para manos', text: 'evita que resequedad en manos y cutículas opaque un set pulido.' },
          { label: 'Guantes de protección', text: 'son útiles para tareas del hogar que pueden acortar la vida del servicio.' },
        ],
        reachTitle: 'Cuándo escribirnos',
        reach:
          'Escríbenos si necesitas una reparación, si no sabes si reservar retiro o relleno, o si quieres ayuda para elegir tu próximo servicio. Puedes comunicarte con Melodi Nails en nailsmelodi@gmail.com o reservar para el estudio del Bronx en 1205 College Ave.',
      }
    : {
        eyebrow: 'Aftercare',
        title: 'Nail Aftercare Guide',
        intro:
          'Proper nail aftercare helps your manicure, gel service, or acrylic set stay polished, comfortable, and long-lasting. A few simple habits after your appointment can make a noticeable difference in shine, retention, and the overall health of your natural nails.',
        habitsTitle: 'Daily Nail Care Habits',
        habitsIntro: 'Follow these habits between appointments to keep your set looking clean and photo-ready:',
        habits: [
          'Apply cuticle oil daily to keep the nail area hydrated and reduce the dry, rough look that can make even a fresh set seem older than it is.',
          'Wear gloves for dishes, deep cleaning, and harsh products. Repeated exposure to water and chemicals can weaken retention and dull the finish.',
          'Avoid picking, biting, or peeling gel, acrylic, or lifting corners. Pulling product off at home can strip layers from the natural nail.',
          'Use your fingertips instead of your nails when opening cans, unbuckling seat belts, peeling labels, or pressing hard buttons.',
          'If one nail lifts, chips, or cracks, schedule a repair promptly. Small damage can turn into a full break if it is ignored.',
          'Rebook regularly if you wear acrylics or structured gel. Maintenance appointments help preserve shape, structure, and balance as your natural nails grow out.',
        ],
        expectTitle: 'What to Expect After Your Appointment',
        expectOne:
          'A fresh set should feel smooth, secure, and balanced when you leave the salon. Over the next one to three weeks, your nails will naturally grow, and everyday wear will begin to show most around the cuticle area and high-contact fingers.',
        expectTwo:
          'Some wear is normal over time, but pain, unusual pressure, or fast lifting is not. If anything feels off soon after your service, reach out early so it can be addressed before the nail is damaged.',
        productsTitle: 'Recommended Products',
        products: [
          { label: 'Cuticle oil', text: 'keeps the surrounding skin soft and supports a cleaner, healthier-looking manicure.' },
          { label: 'Hand cream', text: 'helps prevent dry hands and cuticles from distracting from an otherwise polished set.' },
          { label: 'Protective gloves', text: 'are useful for chores and cleaning tasks that can shorten the life of your service.' },
        ],
        reachTitle: 'When to Reach Out',
        reach:
          'Reach out if you need a repair, are unsure whether to book a removal or fill, or want help choosing the right service for your next visit. Appointments are available for the Bronx studio at 1205 College Ave.',
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

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.habitsTitle}</h2>
        <p>{copy.habitsIntro}</p>
        <ol className="list-decimal space-y-3 pl-6">
          {copy.habits.map((habit) => (
            <li key={habit} className="pl-1">
              {habit}
            </li>
          ))}
        </ol>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.expectTitle}</h2>
        <p>{copy.expectOne}</p>
        <p>{copy.expectTwo}</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.productsTitle}</h2>
        <ul className="space-y-3">
          {copy.products.map((product) => (
            <li key={product.label} className="flex flex-col gap-1">
              {product.label}
              <span>&ndash; {product.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-gray-900">{copy.reachTitle}</h2>
        <p>
          {copy.reach} {isSpanish ? 'Escríbenos a' : 'Email us at'}{' '}
          <a href="mailto:nailsmelodi@gmail.com">nailsmelodi@gmail.com</a>
        </p>
      </section>
    </article>
  );
}
