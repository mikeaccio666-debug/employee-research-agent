import type { ReactNode } from 'react';
import { BasisMark, Pending, cx } from '@portrait/ui';
import { SECTION_LABEL, sectionsOf, type Claim, type Section } from '@/lib/portrait/spec';

// The lines of a drawn portrait, grouped into its sections. Shared by the public page (confirmed
// lines only) and the studio canvas (drafts too, with the person's Right / Not right under each).

type Props = {
  claims: Claim[];
  order: Section[];
  /** Under each line in the studio: the confirm controls. */
  actions?: (claim: Claim) => ReactNode;
  /** The line the agent just changed, lit on the canvas. */
  lit?: string | null;
  className?: string;
};

export function SpecSections({ claims, order, actions, lit, className }: Props) {
  return (
    <div className={cx('flex flex-col gap-[30px]', className)}>
      {sectionsOf(claims, order).map(({ section, claims: lines }) => (
        <section key={section} aria-labelledby={`sec-${section}`}>
          <h2 id={`sec-${section}`} className="lab">
            {SECTION_LABEL[section]}
          </h2>
          {section === 'strengths' ? (
            <ul className="m-0 mt-2 flex p-0 flex-col gap-2.5">
              {lines.map((c) => (
                <Line key={c.id} claim={c} lit={lit === c.id} actions={actions}>
                  <p className="t-s">
                    <BasisMark kind={c.basis === 'inferred' ? 'inf' : 'said'} label="" /> <Statement claim={c} />
                  </p>
                </Line>
              ))}
            </ul>
          ) : (
            <ul className="m-0 mt-2 flex p-0 flex-col gap-3.5">
              {lines.map((c) => (
                <Line key={c.id} claim={c} lit={lit === c.id} actions={actions}>
                  {c.title ? (
                    <p className="t-h3">
                      {c.title}
                      {c.org ? <span className="c2"> · {c.org}</span> : null}
                    </p>
                  ) : null}
                  {c.when ? <p className="t-xs c2">{c.when}</p> : null}
                  <p className={c.title ? 't-s mt-1' : section === 'story' ? 't-h3' : 't-s'}>
                    <Statement claim={c} />
                  </p>
                </Line>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function Line({
  claim,
  lit,
  actions,
  children,
}: {
  claim: Claim;
  lit: boolean;
  actions?: (claim: Claim) => ReactNode;
  children: ReactNode;
}) {
  return (
    <li className={cx('list-none rounded-[4px] transition-colors', lit && 'bg-me-wash')} data-claim={claim.id}>
      {children}
      {actions?.(claim)}
    </li>
  );
}

/** Drafts carry the dashed underline until the person confirms them. */
function Statement({ claim }: { claim: Claim }) {
  return <Pending pending={claim.status === 'draft'}>{claim.statement}</Pending>;
}

/** Identity lines (school, location, availability) beside the name. */
export function IdentityLines({ claims }: { claims: Claim[] }) {
  const lines = claims.filter((c) => c.layer === 'identity');
  if (!lines.length) return null;
  return (
    <div className="flex flex-col gap-0.5">
      {lines.map((c) => (
        <p key={c.id} className="t-xs c2">
          <Statement claim={c} />
        </p>
      ))}
    </div>
  );
}
