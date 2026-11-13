import { emptySpec, type Claim, type Spec } from '@/lib/portrait/spec';

// The person the Jobs page shows when nobody is signed in (previews without Supabase, /design):
// Lin Zhou, the statistics student the rest of the boards use.
const line = (id: string, layer: Claim['layer'], statement: string, title: string | null = null, org: string | null = null): Claim => ({
  id,
  layer,
  kind: layer,
  statement,
  title,
  org,
  when: null,
  basis: 'stated',
  status: 'confirmed',
  pinned: false,
  evidence: [],
  createdBy: 'agent',
  updatedAt: '2026-11-01T00:00:00.000Z',
});

export function exampleSpec(): Spec {
  const s = emptySpec();
  return {
    ...s,
    claims: [
      line('clm_exlin01', 'identity', 'Statistics student at UC Davis, graduating June 2027'),
      line('clm_exlin02', 'experience', 'Built SQL dashboards in Tableau that the finance team used for monthly forecasting', 'Data Analyst Intern', 'Northwind'),
      line('clm_exlin03', 'capability', 'Python and pandas for cleaning messy survey data; A/B test analysis for a campus app'),
      line('clm_exlin04', 'experience', 'Automated the weekly revenue report, saving the operations team about four hours a week', 'Operations Assistant', 'Campus Dining'),
    ],
    preferences: { ...s.preferences, roles: ['data analyst', 'operations analyst'], locations: ['湾区', 'New York'], workAuth: 'F-1, will need sponsorship' },
  };
}
