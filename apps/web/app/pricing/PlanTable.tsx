import type { ReactNode } from 'react';
import { cx } from '@portrait/ui';
import { ScrollX } from '@/components/entry/ScrollX';
import type { PlanCell, PlanRow } from '@/lib/data/entry';
import s from './pricing.module.css';

export type Plan = {
  name: string;
  price: string;
  /** "/mo" after the price */
  monthly?: boolean;
  /** trim column */
  col?: boolean;
  /** the button, or a note, under the price */
  foot: ReactNode;
};

function Cell({ value }: { value: PlanCell }) {
  if (typeof value === 'string') return <>{value}</>;
  if ('yes' in value) {
    return (
      <svg className={s.yes} viewBox="0 0 18 14" role="img" aria-label="Included">
        <path d="M2 8 L7 12 L16 2" />
      </svg>
    );
  }
  return (
    <>
      <span aria-hidden="true">—</span>
      <span className="sr">Not included</span>
    </>
  );
}

/** A plan comparison: plans across the top, one row per feature, alternate columns on trim. */
export function PlanTable({
  kind,
  labelledBy,
  plans,
  rows,
  className,
}: {
  kind: 'startups' | 'people';
  /** id of the heading that names the table */
  labelledBy: string;
  plans: Plan[];
  rows: PlanRow[];
  className?: string;
}) {
  return (
    <ScrollX labelledBy={labelledBy} className={cx(s.scroll, className)}>
      <table className={cx(s.tbl, s[kind])} aria-labelledby={labelledBy}>
        <colgroup>
          <col className={s.cLabel} />
          {plans.map((p) => (
            <col key={p.name} className={s.cPlan} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th scope="col">
              <span className="lab">Plan</span>
            </th>
            {plans.map((p) => (
              <th key={p.name} scope="col" className={cx(p.col && s.col)}>
                <div className={s.h}>
                  <span className="t-h3">{p.name}</span>
                  <span className={s.price}>
                    {p.price}
                    {p.monthly ? <span className="t-s c2 font-medium">/mo</span> : null}
                  </span>
                  {p.foot}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <th scope="row" className={s.k}>
                {r.label}
                {r.note ? <span className="t-xs c2 block">{r.note}</span> : null}
              </th>
              {r.cells.map((c, i) => (
                <td key={i} className={cx(plans[i]?.col && s.col)}>
                  <Cell value={c} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollX>
  );
}
