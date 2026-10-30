import type { Metadata } from 'next';
import { LegalPage, Section, contact } from '../LegalPage';

export const metadata: Metadata = { title: 'Terms' };

// A first draft, like the privacy policy: review it before relying on it.

export default function TermsPage() {
  const email = contact();
  return (
    <LegalPage title="Terms of service" updated="October 21, 2026">
      <p>By using Portrait you agree to these terms. They are short on purpose.</p>

      <Section title="Your portrait is yours">
        <p>
          You own what you write and share. You let us store and process it to run the service, and show your page to the people your visibility
          setting allows. You can take it down at any time.
        </p>
      </Section>

      <Section title="Tell the truth">
        <p>
          Your page should describe what you actually did. Don’t claim others’ work, don’t share material you have no right to share, and don’t use
          Portrait to mislead, harass or spam anyone.
        </p>
      </Section>

      <Section title="The agent drafts, you decide">
        <p>
          The studio agent drafts lines from what you tell it and the documents you share, and it can be wrong. Nothing appears on your page until you
          confirm it, so check each line before you do.
        </p>
      </Section>

      <Section title="Connected apps">
        <p>
          Connecting an app lets the agent read from it on your behalf, as described in the privacy policy. Your use of that app stays under its own
          terms.
        </p>
      </Section>

      <Section title="The service">
        <p>
          Portrait is offered as it is, and is still being built: features may change or stop. We may suspend accounts that break these terms. As far
          as the law allows, we aren’t liable for indirect losses, such as a job you didn’t get.
        </p>
      </Section>

      <Section title="Changes and contact">
        <p>
          If these terms change in a way that matters, we will tell you in the app before it takes effect.
          {email ? (
            <>
              {' '}
              Questions: <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : null}
        </p>
      </Section>
    </LegalPage>
  );
}
