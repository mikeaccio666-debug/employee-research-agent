import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** Hire opens on the one open role's contact sheet. */
export default function HirePage() {
  redirect(routes.contactSheet);
}
