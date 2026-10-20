import type { Metadata } from 'next';
import Link from 'next/link';
import { Button, MarginNote, Ruler, SectionMark, buttonClass } from '@portrait/ui';
import { AccountLink } from '@/components/account/Account';
import { PublicHeader } from '@/components/chrome';
import { peopleRows, startupRows } from '@/lib/data/entry';
import { routes } from '@/lib/routes';
import { PlainAnswers } from './PlainAnswers';
import { PlanTable } from './PlanTable';
import s from './pricing.module.css';

export const metadata: Metadata = { title: 'Pricing' };

const quiet = buttonClass({ variant: 'quiet', size: 'sm' });

/** S13 · pricing (V2-S13-Pricing): free to be found, paid to search. */
export default function PricingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <Ruler />
      <PublicHeader className="flex-wrap gap-x-3">
        <nav aria-label="Main" className="flex gap-1">
          <Link className={quiet} href={routes.events}>
            Events
          </Link>
          <AccountLink variant="quiet" />
          <Link className={buttonClass({ variant: 'secondary', size: 'sm' })} href={routes.studio}>
            Draw yours
          </Link>
        </nav>
      </PublicHeader>

      <main>
        <section className="wrap relative pt-14">
          <SectionMark vw={210} d="M2 6 C50 3 120 7 208 4" isNew className="top-[62px] w-[210px]" />
          <h1 className="t-d pt-[22px]">
            Free to be found.
            <br />
            Paid to search.
          </h1>
          <p className="t-body c2 mt-4 max-w-[58ch]">
            Everything a job seeker needs is free, always. Startups pay for search and outreach. No countdowns, no “only 2
            left.”
          </p>
          <MarginNote className="mt-2.5">Prices are placeholders while we talk to design partners.</MarginNote>
        </section>

        <section className="wrap relative pt-[72px]">
          <SectionMark d="M2 5 C40 7 90 3 148 6" />
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 pt-[18px]">
            <h2 className="t-h1" id="for-startups">
              For startups
            </h2>
            <p className="t-s c2">Monthly · cancel any time</p>
          </div>
          <PlanTable
            kind="startups"
            labelledBy="for-startups"
            className="mt-[18px]"
            rows={startupRows}
            plans={[
              {
                name: 'Free',
                price: '$0',
                col: true,
                foot: (
                  // A startup starts by writing who they need.
                  <Link className={buttonClass({ variant: 'secondary', size: 'sm', className: 'mt-1.5' })} href={routes.brief}>
                    Start free
                  </Link>
                ),
              },
              {
                name: 'Startup',
                price: '$149',
                monthly: true,
                foot: (
                  <Button size="sm" className="mt-1.5">
                    Choose Startup
                  </Button>
                ),
              },
              {
                name: 'Growth',
                price: '$399',
                monthly: true,
                col: true,
                foot: (
                  <Button variant="secondary" size="sm" className="mt-1.5">
                    Talk to us
                  </Button>
                ),
              },
            ]}
          />
        </section>

        <section className="wrap relative pt-[72px]">
          <SectionMark d="M2 6 C50 4 100 7 148 4" />
          <h2 className="t-h1 pt-[18px]" id="for-people">
            For people looking for work
          </h2>
          <PlanTable
            kind="people"
            labelledBy="for-people"
            className="mt-[18px] max-w-[900px]"
            rows={peopleRows}
            plans={[
              {
                name: 'Free',
                price: '$0',
                col: true,
                foot: (
                  <Link className={buttonClass({ size: 'sm', className: 'mt-1.5' })} href={routes.studio}>
                    Draw yours
                  </Link>
                ),
              },
              {
                name: 'Pro',
                price: '$10',
                monthly: true,
                foot: <span className={s.later}>later · not in the first release</span>,
              },
            ]}
          />
        </section>

        <section className="wrap relative pt-[72px] pb-20">
          <SectionMark d="M2 4 C50 6 100 4 148 6" />
          <h2 className="t-h1 pt-[18px]">Plain answers</h2>
          <PlainAnswers />
        </section>
      </main>
    </div>
  );
}
