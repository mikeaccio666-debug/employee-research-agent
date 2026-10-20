/** Renders portrait copy where **double asterisks** mark the bold runs the boards set in <b>. */
export function Rich({ text }: { text: string }) {
  if (!text.includes('**')) return <>{text}</>;
  return <>{text.split('**').map((part, i) => (i % 2 ? <b key={i}>{part}</b> : part))}</>;
}
