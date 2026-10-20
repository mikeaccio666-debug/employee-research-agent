import type { Metadata } from 'next';
import { CoffeeChat } from './CoffeeChat';

export const metadata: Metadata = { title: 'Coffee chat · pick a time' };

/** V2-S08b-CoffeeChat: Lin and Dana (Northwind) find a time on a PT / ET grid. */
export default function CoffeeChatPage() {
  return <CoffeeChat />;
}
