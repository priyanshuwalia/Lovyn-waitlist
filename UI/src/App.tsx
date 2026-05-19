import { ChevronDown } from "lucide-react";
import { useState, type FormEvent } from "react";
import "./index.css";

type InfoBlock = {
  title: string;
  body: string;
};

const navigationItems = [
  { label: "Features", href: "#features" },
  { label: "Our Philosophy", href: "#philosophy" },
  { label: "Community", href: "#community" },
];

const infoRows: InfoBlock[][] = [
  [
    {
      title: "Who it is for",
      body: "Lovyn is designed for individuals seeking quiet luxury in their connections. Those who value depth over volume, discretion over broadcasting, and intentionality over impulse.",
    },
    {
      title: "Inclusive partnerships",
      body: "We honor the diverse spectrum of human connection. Our platform structurally supports varied relationship models and identities with respect and nuance.",
    },
  ],
  [
    {
      title: "Who it is for",
      body: "Lovyn is designed for individuals seeking quiet luxury in their connections. Those who value depth over volume, discretion over broadcasting, and intentionality over impulse.",
    },
    {
      title: "Inclusive partnerships",
      body: "We honor the diverse spectrum of human connection. Our platform structurally supports varied relationship models and identities with respect and nuance.",
    },
  ],
];

const seekingOptions = [
  "A long-term partnership",
  "Intentional dating",
  "Inclusive community",
  "Prefer to share later",
];

export function App() {
  const [submissionMessage, setSubmissionMessage] = useState("");

  function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setSubmissionMessage("Waitlist submissions are not connected to a backend yet.");
  }

  return (
    <div className="lovyn-page">
      <Header />
      <main>
        <Hero />
        <InfoSections />
        <WaitlistSection onSubmit={handleWaitlistSubmit} submissionMessage={submissionMessage} />
      </main>
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="topbar">
      <div className="topbar__inner">
        <a className="wordmark" href="/" aria-label="Lovyn home">
          Lovyn
        </a>
        <nav className="topbar__nav" aria-label="Primary navigation">
          {navigationItems.map(item => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>
        <a className="topbar__button" href="#waitlist">
          Join Waitlist
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="hero" id="community">
      <div className="hero__content">
        <h1>
          <span>Find the connection</span>
          <span>that truly fits your life.</span>
        </h1>
        <p>An intentional, privacy-first space designed for meaningful, inclusive relationships beyond the noise of traditional swiping.</p>
        <a href="#waitlist">JOIN THE WAITLIST</a>
      </div>
    </section>
  );
}

function InfoSections() {
  return (
    <section className="info-sections" aria-label="Lovyn overview">
      {infoRows.map((row, rowIndex) => (
        <div className="info-row" id={rowIndex === 0 ? "features" : "philosophy"} key={`row-${rowIndex}`}>
          {row.map(block => (
            <article className="info-block" key={`${rowIndex}-${block.title}`}>
              <h2>{block.title}</h2>
              <p>{block.body}</p>
            </article>
          ))}
        </div>
      ))}
    </section>
  );
}

type WaitlistSectionProps = {
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submissionMessage: string;
};

function WaitlistSection({ onSubmit, submissionMessage }: WaitlistSectionProps) {
  return (
    <section className="waitlist" id="waitlist">
      <h1>Join the Waitlist</h1>
      <form className="waitlist-form" onSubmit={onSubmit}>
        <div className="field-group">
          <label htmlFor="full-name">Full Name</label>
          <input id="full-name" name="fullName" type="text" placeholder="Jane Doe" autoComplete="name" required />
        </div>

        <div className="field-group">
          <label htmlFor="email-address">Email Address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            placeholder="jane@example.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="field-group">
          <label htmlFor="seeking">What are you seeking?</label>
          <div className="select-field">
            <select id="seeking" name="seeking" defaultValue="" required>
              <option value="" disabled>
                Select an option
              </option>
              {seekingOptions.map(option => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" strokeWidth={2} />
          </div>
        </div>

        <button type="submit">SUBMIT REQUEST</button>
        <p className="conduct-note">By joining, you agree to our standard of respectful conduct.</p>
        {submissionMessage ? (
          <p className="form-status" aria-live="polite">
            {submissionMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <a className="footer__wordmark" href="/" aria-label="Lovyn home">
          Lovyn
        </a>
        <p>© 2024 Lovyn. Intentionally crafted for human connection.</p>
        <nav className="footer__links" aria-label="Footer navigation">
          <a href="#privacy">Privacy</a>
          <a href="#terms">Terms</a>
          <a href="#safety">Safety</a>
          <a href="#instagram">Instagram</a>
        </nav>
      </div>
    </footer>
  );
}

export default App;
