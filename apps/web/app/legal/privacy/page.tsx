import type { Metadata } from 'next';
import { LegalPage, Section, contact } from '../LegalPage';

export const metadata: Metadata = { title: 'Privacy policy' };

// A first draft written with the product as built: review it (ideally with a lawyer) before
// relying on it, and keep it in step with what the app does.

export default function PrivacyPolicyPage() {
  const email = contact();
  return (
    <LegalPage title="Privacy policy" updated="October 21, 2026">
      <p>
        Portrait helps you build a page about your work from what you have actually done, and lets you choose who sees it. This page says what we
        keep, why, who else handles it, and how to remove it.
      </p>

      <Section title="What we keep">
        <ul className="list-disc pl-5 flex flex-col gap-1">
          <li>Your account: the email address and name your sign-in gives us (Google or an email link), and the link name you choose.</li>
          <li>Your conversation with the studio agent, and the portrait it drafts with you, including lines you confirm or reject.</li>
          <li>Documents you share: résumés you upload, pages you link, and pages the agent reads from apps you connect.</li>
          <li>What you are looking for (roles, places, when you can start), used only to match you and never shown on your page.</li>
          <li>For each app you connect, its sign-in tokens, encrypted so that our database alone can’t read them.</li>
          <li>Which apps you asked us to add.</li>
        </ul>
      </Section>

      <Section title="How we use it">
        <p>
          To run the studio: the agent reads what you share to draft lines, and every line it drafts quotes where it came from. Only lines you confirm
          appear on your page, and your page is only as visible as you set it. We don’t sell your information, and we don’t use it for advertising.
        </p>
      </Section>

      <Section title="AI providers">
        <p>
          The agent runs on models from OpenAI and Anthropic. What you write and share in the studio is sent to the provider of the model in use to
          produce each reply. We ask OpenAI not to store it (the API’s store setting is off), and under both providers’ API terms it isn’t used to
          train their models by default.
        </p>
      </Section>

      <Section title="Connected apps">
        <p>
          When you connect an app such as Notion or GitHub, you sign in on that app’s own page and it gives us a token. The agent uses it only to
          search and read, when you point it at something there or to look for evidence of what you told it; it never changes, sends or deletes
          anything. A page it reads becomes one of your documents, so lines can quote it. Disconnecting an app deletes its token and asks the app
          to cancel it; pages already read stay among your documents until you delete them.
        </p>
        <p>
          Portrait’s use of information received from Google APIs will adhere to the Google API Services User Data Policy, including the Limited Use
          requirements.
        </p>
      </Section>

      <Section title="Who else handles it">
        <p>
          Supabase (our database, sign-in and file storage), Vercel (hosting), and the AI providers above, each only to run the service. Startups and
          other people see what your page’s visibility allows, nothing more.
        </p>
      </Section>

      <Section title="Cookies">
        <p>We use cookies to keep you signed in and to finish connecting an app. No advertising or tracking cookies.</p>
      </Section>

      <Section title="Keeping and removing it">
        <p>
          We keep your information while you have an account. You can unpublish your page, remove lines and disconnect apps at any time.
          {email ? (
            <>
              {' '}
              To delete your account and everything in it, write to <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            ' To delete your account and everything in it, ask us and we will do it.'
          )}
        </p>
      </Section>

      <Section title="Children">
        <p>Portrait is for people looking for work, and isn’t meant for anyone under 16.</p>
      </Section>

      <Section title="Changes">
        <p>If this policy changes in a way that matters, we will tell you in the app before it takes effect.</p>
      </Section>
    </LegalPage>
  );
}
