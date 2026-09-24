import { AlertCircle, CheckCircle2, ChevronDown, LoaderCircle, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { IntentionsPill, WaitlistActions, WhyLovyn } from "./components/landing";
import "./index.css";
import { seekingOptions, waitlistSubmissionSchema, type WaitlistSubmission } from "./waitlist-contract";

type FieldErrors = Partial<Record<keyof WaitlistSubmission, string>>;

type ToastState = {
  id: number;
  type: "success" | "error";
  title: string;
  message?: string;
};

type WaitlistApiResponse = {
  data: {
    id: string;
    status: "registered" | "already_registered";
  };
};

const apiBaseUrl = getApiBaseUrl();

const navigationItems = [
  { label: "Features", href: "#features" },
  { label: "Our Philosophy", href: "#philosophy" },
  { label: "Community", href: "#community" },
];

const intentionOptions = [
  "intentional dating",
  "lavender marriage",
  "commitment, not confusion",
  "the same future as you",
  "meaningful connection",
] as const;

function scrollToSectionCenter(href: string) {
  const targetId = href.startsWith("#") ? href.slice(1) : href;
  const section = document.getElementById(targetId);

  if (!section) {
    return;
  }

  const target =
    targetId === "waitlist"
      ? section.querySelector(".waitlist-form") ?? section
      : targetId === "features"
        ? section.querySelector(".why-lovyn__inner") ?? section
        : section;

  target.scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
  window.history.pushState(null, "", `#${targetId}`);
}

export function App() {
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  async function handleWaitlistSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = Object.fromEntries(new FormData(form));
    const parsedSubmission = waitlistSubmissionSchema.safeParse(formData);

    setSubmissionMessage("");

    if (!parsedSubmission.success) {
      const nextFieldErrors = getFieldErrorsFromZod(parsedSubmission.error);
      setFieldErrors(nextFieldErrors);
      showToast("error", "Check the form", getFirstFieldError(nextFieldErrors) ?? "Please review the highlighted fields.");
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const result = await submitWaitlist(parsedSubmission.data);
      const message =
        result.data.status === "already_registered"
          ? "You're already on the waitlist."
          : "You're on the waitlist. We will be in touch soon.";

      form.reset();
      setSubmissionMessage(message);
      showToast("success", "Request received", message);
    } catch (error) {
      const apiError = normalizeSubmissionError(error);

      if (apiError.fieldErrors) {
        setFieldErrors(apiError.fieldErrors);
      }

      showToast("error", apiError.title, apiError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function showToast(type: ToastState["type"], title: string, message?: string) {
    const nextToast = {
      id: Date.now(),
      type,
      title,
      message,
    };

    setToast(nextToast);
    window.setTimeout(() => {
      setToast(currentToast => (currentToast?.id === nextToast.id ? null : currentToast));
    }, 5200);
  }

  return (
    <div className="lovyn-page">
      <Header />
      <main>
        <Hero />
        <WhyLovyn />
        <WaitlistSection
          fieldErrors={fieldErrors}
          isSubmitting={isSubmitting}
          onSubmit={handleWaitlistSubmit}
          submissionMessage={submissionMessage}
        />
      </main>
      <Footer />
      <Toast toast={toast} onDismiss={() => setToast(null)} />
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
            <a
              key={item.href}
              href={item.href}
              onClick={event => {
                event.preventDefault();
                scrollToSectionCenter(item.href);
              }}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <a
          className="topbar__button"
          href="#waitlist"
          onClick={event => {
            event.preventDefault();
            scrollToSectionCenter("#waitlist");
          }}
        >
          Join Waitlist
        </a>
      </div>
    </header>
  );
}

function Hero() {
  const [activeIntentionIndex, setActiveIntentionIndex] = useState(0);
  const [isDeletingIntention, setIsDeletingIntention] = useState(false);
  const [typedIntention, setTypedIntention] = useState("");

  useEffect(() => {
    const currentIntention = intentionOptions[activeIntentionIndex] ?? intentionOptions[0];
    const hasFullIntention = typedIntention === currentIntention;
    const delay = hasFullIntention && !isDeletingIntention ? 1300 : isDeletingIntention ? 36 : 72;

    const typingTimer = window.setTimeout(() => {
      if (hasFullIntention && !isDeletingIntention) {
        setIsDeletingIntention(true);
        return;
      }

      if (isDeletingIntention) {
        if (typedIntention.length > 0) {
          setTypedIntention(currentValue => currentValue.slice(0, -1));
          return;
        }

        setIsDeletingIntention(false);
        setActiveIntentionIndex(currentIndex => (currentIndex + 1) % intentionOptions.length);
        return;
      }

      setTypedIntention(currentIntention.slice(0, typedIntention.length + 1));
    }, delay);

    return () => window.clearTimeout(typingTimer);
  }, [activeIntentionIndex, isDeletingIntention, typedIntention]);

  return (
    <section className="hero" id="community">
      <div className="hero__content">
        <IntentionsPill className="" />
        <h1>
          <span>Find people for</span>
          <span className="italic hero__dynamic-intention" aria-live="polite">
            <span className="hero__typewriter">
              <span className="hero__typed-text">{typedIntention ? `${typedIntention}.` : "\u00a0"}</span>
              <span className="hero__type-cursor" aria-hidden="true" />
            </span>
          </span>
        </h1>
        <p className="hero__para">A privacy-first relationship platform designed to connect people through shared intentions, values, and life goals, not endless swiping.</p>
        <WaitlistActions
          className="hero__actions"
          primaryAction={{
            label: "Join the Waitlist",
            href: "#waitlist",
            onClick: () => scrollToSectionCenter("#waitlist"),
          }}
          secondaryAction={{
            label: "Learn More",
            href: "#features",
            onClick: () => scrollToSectionCenter("#features"),
          }}
        />
      </div>
    </section>
  );
}

type WaitlistSectionProps = {
  fieldErrors: FieldErrors;
  isSubmitting: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submissionMessage: string;
};

function WaitlistSection({ fieldErrors, isSubmitting, onSubmit, submissionMessage }: WaitlistSectionProps) {
  return (
    <section className="waitlist" id="waitlist">
      <h1>Join the Waitlist</h1>
      <form className="waitlist-form" onSubmit={onSubmit} noValidate>
        <div className="field-group">
          <label htmlFor="full-name">Full Name</label>
          <input
            id="full-name"
            name="fullName"
            type="text"
            placeholder="Jane Doe"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.fullName)}
            aria-describedby={fieldErrors.fullName ? "full-name-error" : undefined}
          />
          {fieldErrors.fullName ? (
            <p className="field-error" id="full-name-error">
              {fieldErrors.fullName}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label htmlFor="email-address">Email Address</label>
          <input
            id="email-address"
            name="email"
            type="email"
            placeholder="jane@example.com"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-address-error" : undefined}
          />
          {fieldErrors.email ? (
            <p className="field-error" id="email-address-error">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div className="field-group">
          <label htmlFor="seeking">What are you seeking?</label>
          <div className="select-field">
            <select
              id="seeking"
              name="seeking"
              defaultValue=""
              aria-invalid={Boolean(fieldErrors.seeking)}
              aria-describedby={fieldErrors.seeking ? "seeking-error" : undefined}
            >
              <option value="" disabled>
                Select an option
              </option>
              {seekingOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDown aria-hidden="true" strokeWidth={2} />
          </div>
          {fieldErrors.seeking ? (
            <p className="field-error" id="seeking-error">
              {fieldErrors.seeking}
            </p>
          ) : null}
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <LoaderCircle className="button-spinner" aria-hidden="true" strokeWidth={2} />
              SUBMITTING
            </>
          ) : (
            "SUBMIT REQUEST"
          )}
        </button>
        <p className="conduct-note">By joining, You agree to our standard of respectful conduct.</p>
        {submissionMessage ? (
          <p className="form-status" aria-live="polite">
            {submissionMessage}
          </p>
        ) : null}
      </form>
    </section>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  if (!toast) {
    return null;
  }

  const Icon = toast.type === "success" ? CheckCircle2 : AlertCircle;

  return (
    <div className={`toast toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
      <Icon className="toast__icon" aria-hidden="true" strokeWidth={2} />
      <div className="toast__content">
        <p className="toast__title">{toast.title}</p>
        {toast.message ? <p className="toast__message">{toast.message}</p> : null}
      </div>
      <button type="button" className="toast__close" onClick={onDismiss} aria-label="Dismiss notification">
        <X aria-hidden="true" strokeWidth={2} />
      </button>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__inner">
        <a className="footer__wordmark" href="/" aria-label="Lovyn home">
          Lovyn
        </a>
        <p> ©2026 Lovyn. Intentionally crafted for human connection.</p>
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

async function submitWaitlist(payload: WaitlistSubmission): Promise<WaitlistApiResponse> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}/api/waitlist`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error("We could not reach the waitlist server. Please try again in a moment.");
  }

  const responseBody = await parseJsonResponse(response);

  if (!response.ok) {
    throw createApiError(responseBody);
  }

  return waitlistApiResponseSchema.parse(responseBody);
}

const waitlistApiResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    status: z.enum(["registered", "already_registered"]),
  }),
});

const apiErrorSchema = z.object({
  error: z
    .object({
      message: z.string().optional(),
      issues: z
        .array(
          z.object({
            path: z.string(),
            message: z.string(),
          }),
        )
        .optional(),
    })
    .optional(),
});

async function parseJsonResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function createApiError(responseBody: unknown) {
  const parsedError = apiErrorSchema.safeParse(responseBody);

  if (!parsedError.success || !parsedError.data.error) {
    return new Error("The waitlist request failed. Please try again.");
  }

  const fieldErrors = getFieldErrorsFromApiIssues(parsedError.data.error.issues ?? []);
  const error = new Error(parsedError.data.error.message ?? "The waitlist request failed. Please try again.");

  return Object.assign(error, {
    fieldErrors: Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined,
  });
}

function normalizeSubmissionError(error: unknown) {
  if (error instanceof z.ZodError) {
    return {
      title: "Unexpected response",
      message: "The waitlist server returned an unexpected response.",
    };
  }

  if (error instanceof Error) {
    return {
      title: "Request failed",
      message: error.message,
      fieldErrors: "fieldErrors" in error ? (error.fieldErrors as FieldErrors | undefined) : undefined,
    };
  }

  return {
    title: "Request failed",
    message: "The waitlist request failed. Please try again.",
  };
}

function getFieldErrorsFromZod(error: z.ZodError<WaitlistSubmission>) {
  const fieldErrors: FieldErrors = {};

  for (const issue of error.issues) {
    const field = issue.path[0];

    if (isWaitlistField(field) && !fieldErrors[field]) {
      fieldErrors[field] = issue.message;
    }
  }

  return fieldErrors;
}

function getFieldErrorsFromApiIssues(issues: Array<{ path: string; message: string }>) {
  const fieldErrors: FieldErrors = {};

  for (const issue of issues) {
    if (isWaitlistField(issue.path) && !fieldErrors[issue.path]) {
      fieldErrors[issue.path] = issue.message;
    }
  }

  return fieldErrors;
}

function getFirstFieldError(fieldErrors: FieldErrors) {
  return fieldErrors.fullName ?? fieldErrors.email ?? fieldErrors.seeking;
}

function isWaitlistField(field: unknown): field is keyof WaitlistSubmission {
  return field === "fullName" || field === "email" || field === "seeking";
}

function getApiBaseUrl() {
  return (process.env.BUN_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}

export default App;
