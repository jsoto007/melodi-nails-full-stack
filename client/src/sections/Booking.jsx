import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import FadeIn from '../components/FadeIn.jsx';
import Button from '../components/Button.jsx';
import Card from '../components/Card.jsx';
import { BOOKING_REQUIREMENTS } from '../data/bookingRequirements.js';

export default function Booking() {
  const navigate = useNavigate();
  const requirementList = useMemo(
    () =>
      BOOKING_REQUIREMENTS.map((item, index) => (
        <li key={item} className="group flex items-start gap-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.65)] transition duration-200 group-hover:-translate-x-[2px] group-hover:-translate-y-[2px] dark:bg-white dark:text-black dark:shadow-[0_10px_30px_-12px_rgba(255,255,255,0.6)]">
            {index + 1}
          </span>
          <span className="pt-2 text-xs font-semibold uppercase leading-relaxed tracking-[0.25em] text-gray-800 dark:text-gray-100">
            {item}
          </span>
        </li>
      )),
    []
  );

  return (
    <section
      id="booking"
      className="bg-white py-20 text-gray-900 dark:bg-black dark:text-gray-100"
    >
      <FadeIn className="mx-auto max-w-6xl space-y-10 px-6" delayStep={0.18}>
        <div className="space-y-4 md:max-w-3xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.35em] text-gray-500 dark:text-gray-400">
            Booking
          </p>
          <h2 className="text-4xl font-semibold uppercase leading-[1.05] tracking-tight text-black sm:text-5xl dark:text-white">
            Reserve your session
          </h2>
          <p className="text-base leading-relaxed text-gray-600 dark:text-gray-300">
            Share your idea, upload verification, and lock in a working hour that fits your schedule.
          </p>
        </div>

        <Card className="relative overflow-hidden px-8 py-10 shadow-soft transition duration-300 sm:p-10">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-start">
            <div className="space-y-6">
              <p className="border-b-2 border-gray-200 pb-6 text-base leading-relaxed text-gray-700 dark:border-gray-800 dark:text-gray-200">
                Bookings include secure document upload for design prep and age checks. Files are encrypted and private.
              </p>
              <ul className="space-y-4">{requirementList}</ul>
            </div>
            <div className="flex items-center md:justify-end">
              <Button type="button" onClick={() => navigate('/share-your-idea')} className="w-full px-10 py-4 md:w-auto">
                Start Booking
              </Button>
            </div>
          </div>
        </Card>
      </FadeIn>
    </section>
  );
}
