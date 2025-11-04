import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FadeIn from '../components/FadeIn.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import SectionTitle from '../components/SectionTitle.jsx';
import { BOOKING_REQUIREMENTS } from '../data/bookingRequirements.js';

export default function Booking() {
  const navigate = useNavigate();
  const requirementList = useMemo(
    () =>
      BOOKING_REQUIREMENTS.map((item, index) => (
        <li key={index} className="text-xs uppercase tracking-[0.25em] text-gray-500 dark:text-gray-400">
          {item}
        </li>
      )),
    []
  );

  return (
    <section id="booking" className="bg-white py-16 text-gray-900 dark:bg-black dark:text-gray-100">
      <FadeIn className="mx-auto flex max-w-6xl flex-col gap-12 px-6" delayStep={0.18}>
        <SectionTitle
          eyebrow="Booking"
          title="Reserve your session"
          description="Share your idea, upload verification, and lock in a working hour that fits your schedule."
        />
        <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Booking requests now include secure document intake so we can prepare custom design time and confirm age
              requirements before meeting. Files are encrypted at rest and visible only to our team unless you toggle
              otherwise.
            </p>
            <ul className="space-y-1">{requirementList}</ul>
          </div>
          <Button type="button" onClick={() => navigate('/share-your-idea')}>
            Start Booking
          </Button>
        </Card>
      </FadeIn>
    </section>
  );
}
