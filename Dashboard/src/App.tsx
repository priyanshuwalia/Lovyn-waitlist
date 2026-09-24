import { AlertCircle, CheckCircle2, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./index.css";

type EmailDeliveryStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

type Participant = {
  id: string;
  fullName: string;
  email: string;
  seeking: string;
  seekingLabel: string;
  confirmationEmailStatus: EmailDeliveryStatus;
  confirmationEmailSentAt: string | null;
  confirmationEmailFailure: string | null;
  createdAt: string;
  updatedAt: string;
};

type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type AdminResponse = {
  data: Participant[];
  pagination: Pagination;
  requestedBy: {
    id: string;
    name: string;
    email: string;
  };
};

type LoadState =
  | { status: "idle" | "loading" }
  | { status: "loaded"; response: AdminResponse }
  | { status: "error"; message: string };

const apiBaseUrl = getApiBaseUrl();
const tokenStorageKey = "lovyn-admin-token";

export function App() {
  const [adminToken, setAdminToken] = useState(() => localStorage.getItem(tokenStorageKey) ?? "");
  const [draftToken, setDraftToken] = useState(adminToken);
  const [page, setPage] = useState(1);
  const [loadState, setLoadState] = useState<LoadState>({ status: adminToken ? "loading" : "idle" });
  const [resendingParticipantId, setResendingParticipantId] = useState<string | null>(null);
  const participants = loadState.status === "loaded" ? loadState.response.data : [];
  const pagination = loadState.status === "loaded" ? loadState.response.pagination : null;
  const totalRegistered = pagination?.total ?? 0;
  const sentCount = useMemo(
    () => participants.filter(participant => participant.confirmationEmailStatus === "SENT").length,
    [participants],
  );

  useEffect(() => {
    if (!adminToken) {
      setLoadState({ status: "idle" });
      return;
    }

    void loadParticipants(adminToken, page);
  }, [adminToken, page]);

  async function loadParticipants(token: string, nextPage: number) {
    setLoadState({ status: "loading" });

    try {
      const response = await apiFetch<AdminResponse>(
        `/api/admin/waitlist-participants?page=${nextPage}&pageSize=25`,
        token,
      );
      setLoadState({ status: "loaded", response });
    } catch (error) {
      setLoadState({ status: "error", message: getErrorMessage(error) });
    }
  }

  function handleTokenSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextToken = draftToken.trim();
    setAdminToken(nextToken);
    setPage(1);

    if (nextToken) {
      localStorage.setItem(tokenStorageKey, nextToken);
    } else {
      localStorage.removeItem(tokenStorageKey);
    }
  }

  async function resendConfirmation(participantId: string) {
    setResendingParticipantId(participantId);

    try {
      await apiFetch(`/api/admin/waitlist-participants/${participantId}/resend-confirmation`, adminToken, {
        method: "POST",
      });
      await loadParticipants(adminToken, page);
    } catch (error) {
      setLoadState({ status: "error", message: getErrorMessage(error) });
    } finally {
      setResendingParticipantId(null);
    }
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-header">
        <div>
          <p className="eyebrow">Lovyn Admin</p>
          <h1>Waitlist Dashboard</h1>
          <p className="header-copy">Review signups, monitor confirmation emails, and retry delivery when needed.</p>
        </div>
        <form className="token-form" onSubmit={handleTokenSubmit}>
          <label htmlFor="admin-token">Admin API token</label>
          <div className="token-row">
            <input
              id="admin-token"
              type="password"
              value={draftToken}
              onChange={event => setDraftToken(event.target.value)}
              placeholder="Paste ADMIN_API_TOKEN"
              autoComplete="off"
            />
            <button type="submit">{adminToken ? "Update" : "Connect"}</button>
          </div>
        </form>
      </section>

      <section className="stats-grid" aria-label="Waitlist summary">
        <StatCard label="Total signups" value={totalRegistered.toLocaleString()} />
        <StatCard label="Shown this page" value={participants.length.toLocaleString()} />
        <StatCard label="Sent on page" value={sentCount.toLocaleString()} />
      </section>

      <section className="participants-panel">
        <div className="panel-heading">
          <div>
            <h2>Participants</h2>
            {pagination ? (
              <p>
                Page {pagination.page} of {Math.max(pagination.totalPages, 1)}
              </p>
            ) : (
              <p>Connect with an admin token to load the waitlist.</p>
            )}
          </div>
          <button
            type="button"
            className="secondary-button"
            onClick={() => void loadParticipants(adminToken, page)}
            disabled={!adminToken || loadState.status === "loading"}
          >
            <RefreshCw size={16} aria-hidden="true" />
            Refresh
          </button>
        </div>

        {loadState.status === "idle" ? <EmptyState message="Enter the admin token to view signups." /> : null}
        {loadState.status === "loading" ? <LoadingState /> : null}
        {loadState.status === "error" ? <ErrorState message={loadState.message} /> : null}
        {loadState.status === "loaded" && participants.length === 0 ? (
          <EmptyState message="No waitlist participants yet." />
        ) : null}
        {loadState.status === "loaded" && participants.length > 0 && pagination ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Seeking</th>
                    <th>Email status</th>
                    <th>Joined</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map(participant => (
                    <tr key={participant.id}>
                      <td>
                        <strong>{participant.fullName}</strong>
                      </td>
                      <td>{participant.email}</td>
                      <td>{participant.seekingLabel}</td>
                      <td>
                        <StatusBadge status={participant.confirmationEmailStatus} />
                        {participant.confirmationEmailFailure ? (
                          <p className="failure-text">{participant.confirmationEmailFailure}</p>
                        ) : null}
                      </td>
                      <td>{formatDate(participant.createdAt)}</td>
                      <td>
                        <button
                          type="button"
                          className="row-button"
                          onClick={() => void resendConfirmation(participant.id)}
                          disabled={resendingParticipantId === participant.id}
                        >
                          {resendingParticipantId === participant.id ? (
                            <LoaderCircle className="spin" size={16} aria-hidden="true" />
                          ) : null}
                          Resend email
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination-row">
              <button
                type="button"
                onClick={() => setPage(currentPage => Math.max(1, currentPage - 1))}
                disabled={!pagination?.hasPreviousPage}
              >
                Previous
              </button>
              <span>
                {pagination.total.toLocaleString()} total participant{pagination.total === 1 ? "" : "s"}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage => currentPage + 1)}
                disabled={!pagination?.hasNextPage}
              >
                Next
              </button>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ status }: { status: EmailDeliveryStatus }) {
  const Icon = status === "SENT" ? CheckCircle2 : AlertCircle;

  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <Icon size={14} aria-hidden="true" />
      {status.toLowerCase()}
    </span>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="state-box">{message}</div>;
}

function LoadingState() {
  return (
    <div className="state-box state-box--loading">
      <LoaderCircle className="spin" size={18} aria-hidden="true" />
      Loading waitlist...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return <div className="state-box state-box--error">{message}</div>;
}

async function apiFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the Lovyn API.");
  }

  const body = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(readApiError(body) ?? "The admin request failed.");
  }

  return body as T;
}

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

function readApiError(body: unknown) {
  if (!body || typeof body !== "object" || !("error" in body)) {
    return null;
  }

  const error = body.error;
  if (!error || typeof error !== "object" || !("message" in error) || typeof error.message !== "string") {
    return null;
  }

  return error.message;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getApiBaseUrl() {
  return (process.env.BUN_PUBLIC_API_BASE_URL || "http://localhost:4000").replace(/\/$/, "");
}

export default App;
