import { redirect } from 'next/navigation';
import { routes } from '@/lib/routes';

/** /settings has one page so far: privacy and visibility. */
export default function SettingsPage() {
  redirect(routes.privacy);
}
