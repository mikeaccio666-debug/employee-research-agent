import type { Metadata } from 'next';
import { FirstPublish } from './FirstPublish';

export const metadata: Metadata = { title: 'First publish' };

/** S15 · first publish (V2-S15-FirstPublish): the first line drawn on the doorframe. */
export default function FirstPublishPage() {
  return <FirstPublish />;
}
