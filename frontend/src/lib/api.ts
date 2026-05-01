// Typed fetch client wrapping all backend API calls.
// Attaches Supabase JWT to every request. Exports one function per endpoint group.

import type { Contact, Edge, Member, Plan, Tag, Workspace } from "@/types";

// ---------------------------------------------------------------------------
// Error classes
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class PlanLimitError extends ApiError {
  constructor(
    public resource: string,
    public limit: number,
    public current: number,
  ) {
    super(402, `Plan limit exceeded for ${resource}: ${current}/${limit}`);
    this.name = "PlanLimitError";
  }
}

// ---------------------------------------------------------------------------
// Base fetcher
// ---------------------------------------------------------------------------

type FetchOptions = Omit<RequestInit, "body"> & {
  token?: string;
  body?: unknown;
  formData?: FormData;
};

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, body, formData, headers: extraHeaders, ...rest } = options;

  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Only set Content-Type for JSON bodies; let fetch set it for FormData
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  // Merge any caller-supplied headers
  if (extraHeaders) {
    Object.assign(headers, extraHeaders);
  }

  const init: RequestInit = {
    ...rest,
    headers,
    body: formData ?? (body !== undefined ? JSON.stringify(body) : undefined),
  };

  const response = await fetch(url, init);

  if (!response.ok) {
    let errorDetail: unknown;
    try {
      errorDetail = await response.json();
    } catch {
      errorDetail = undefined;
    }

    // 402 → PlanLimitError
    if (response.status === 402) {
      const d = errorDetail as { detail?: { resource?: string; limit?: number; current?: number } };
      const detail = d?.detail ?? {};
      throw new PlanLimitError(
        detail.resource ?? "unknown",
        detail.limit ?? 0,
        detail.current ?? 0,
      );
    }

    const message =
      (errorDetail as { detail?: string; message?: string })?.detail ??
      (errorDetail as { detail?: string; message?: string })?.message ??
      response.statusText;

    throw new ApiError(response.status, message, errorDetail);
  }

  // 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Inline types for endpoints not covered by types/index.ts
// ---------------------------------------------------------------------------

export interface MeResponse {
  contact: Contact | null;
  profile_complete: boolean;
}

export interface ProfileUpdate {
  name?: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface ContactCreate {
  name: string;
  job_title?: string;
  company?: string;
  linkedin_url?: string;
  email?: string;
  phone?: string;
  notes?: string;
}

export interface EdgeCreate {
  source_contact_id: string;
  target_contact_id: string;
  label?: string;
  notes?: string;
}

export interface CsvImportResult {
  imported: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export interface PathResult {
  paths: Contact[][];
}

export interface InviteInfo {
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
}

export interface BillingStatus {
  tier: "free" | "pro";
  plan?: Plan;
}

export interface CheckoutResponse {
  checkout_url: string;
}

export interface PortalResponse {
  portal_url: string;
}

// Admin-specific types
export interface AdminUser {
  id: string;
  email: string;
  display_name: string | null;
  is_superadmin: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  workspace_count?: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  member_count: number;
  contact_count: number;
  tier: string;
  created_at: string;
}

export interface AdminSubscription {
  id: string;
  workspace_id: string;
  workspace_name: string;
  stripe_subscription_id: string | null;
  tier: string;
  status: string;
  max_members: number;
  max_contacts: number;
}

export interface AdminStats {
  total_users: number;
  total_workspaces: number;
  total_contacts: number;
  active_subscriptions: number;
}

// ---------------------------------------------------------------------------
// Workspaces API
// ---------------------------------------------------------------------------

export const workspacesApi = {
  list: (token: string) =>
    apiFetch<Workspace[]>("/api/v1/workspaces", { token }),

  create: (token: string, body: { name: string }) =>
    apiFetch<Workspace>("/api/v1/workspaces", { method: "POST", token, body }),

  get: (token: string, id: string) =>
    apiFetch<Workspace>(`/api/v1/workspaces/${id}`, { token }),

  update: (token: string, id: string, body: { name: string }) =>
    apiFetch<Workspace>(`/api/v1/workspaces/${id}`, { method: "PATCH", token, body }),

  remove: (token: string, id: string) =>
    apiFetch<void>(`/api/v1/workspaces/${id}`, { method: "DELETE", token }),

  listMembers: (token: string, id: string) =>
    apiFetch<Member[]>(`/api/v1/workspaces/${id}/members`, { token }),

  updateMember: (token: string, id: string, userId: string, body: { role: string }) =>
    apiFetch<Member>(`/api/v1/workspaces/${id}/members/${userId}`, {
      method: "PATCH",
      token,
      body,
    }),

  removeMember: (token: string, id: string, userId: string) =>
    apiFetch<void>(`/api/v1/workspaces/${id}/members/${userId}`, {
      method: "DELETE",
      token,
    }),

  getMe: (token: string, id: string) =>
    apiFetch<MeResponse>(`/api/v1/workspaces/${id}/me`, { token }),

  updateMe: (token: string, id: string, body: ProfileUpdate) =>
    apiFetch<Contact>(`/api/v1/workspaces/${id}/me`, { method: "PATCH", token, body }),
};

// ---------------------------------------------------------------------------
// Contacts API
// ---------------------------------------------------------------------------

export const contactsApi = {
  list: (token: string, workspaceId: string) =>
    apiFetch<Contact[]>(`/api/v1/workspaces/${workspaceId}/contacts`, { token }),

  create: (token: string, workspaceId: string, body: ContactCreate) =>
    apiFetch<Contact>(`/api/v1/workspaces/${workspaceId}/contacts`, {
      method: "POST",
      token,
      body,
    }),

  update: (token: string, workspaceId: string, contactId: string, body: Partial<ContactCreate>) =>
    apiFetch<Contact>(`/api/v1/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: "PATCH",
      token,
      body,
    }),

  remove: (token: string, workspaceId: string, contactId: string) =>
    apiFetch<void>(`/api/v1/workspaces/${workspaceId}/contacts/${contactId}`, {
      method: "DELETE",
      token,
    }),

  importCsv: (token: string, workspaceId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiFetch<CsvImportResult>(
      `/api/v1/workspaces/${workspaceId}/contacts/import`,
      { method: "POST", token, formData },
    );
  },
};

// ---------------------------------------------------------------------------
// Edges API
// ---------------------------------------------------------------------------

export const edgesApi = {
  list: (token: string, workspaceId: string) =>
    apiFetch<Edge[]>(`/api/v1/workspaces/${workspaceId}/edges`, { token }),

  create: (token: string, workspaceId: string, body: EdgeCreate) =>
    apiFetch<Edge>(`/api/v1/workspaces/${workspaceId}/edges`, {
      method: "POST",
      token,
      body,
    }),

  remove: (token: string, workspaceId: string, edgeId: string) =>
    apiFetch<void>(`/api/v1/workspaces/${workspaceId}/edges/${edgeId}`, {
      method: "DELETE",
      token,
    }),
};

// ---------------------------------------------------------------------------
// Tags API
// ---------------------------------------------------------------------------

export const tagsApi = {
  list: (token: string, workspaceId: string) =>
    apiFetch<Tag[]>(`/api/v1/workspaces/${workspaceId}/tags`, { token }),

  create: (token: string, workspaceId: string, body: { name: string; color: string }) =>
    apiFetch<Tag>(`/api/v1/workspaces/${workspaceId}/tags`, {
      method: "POST",
      token,
      body,
    }),

  attach: (token: string, workspaceId: string, contactId: string, tagId: string) =>
    apiFetch<void>(
      `/api/v1/workspaces/${workspaceId}/tags/contacts/${contactId}/tags/${tagId}`,
      { method: "POST", token },
    ),

  detach: (token: string, workspaceId: string, contactId: string, tagId: string) =>
    apiFetch<void>(
      `/api/v1/workspaces/${workspaceId}/tags/contacts/${contactId}/tags/${tagId}`,
      { method: "DELETE", token },
    ),
};

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------

export const searchApi = {
  search: (token: string, workspaceId: string, q: string) => {
    const params = new URLSearchParams({ q });
    return apiFetch<Contact[]>(
      `/api/v1/workspaces/${workspaceId}/search?${params.toString()}`,
      { token },
    );
  },
};

// ---------------------------------------------------------------------------
// Paths API
// ---------------------------------------------------------------------------

export const pathsApi = {
  find: (
    token: string,
    workspaceId: string,
    fromContactId: string,
    toContactId: string,
  ) => {
    const params = new URLSearchParams({
      from_contact_id: fromContactId,
      to_contact_id: toContactId,
    });
    return apiFetch<PathResult>(
      `/api/v1/workspaces/${workspaceId}/paths?${params.toString()}`,
      { token },
    );
  },
};

// ---------------------------------------------------------------------------
// Auth API
// ---------------------------------------------------------------------------

export const authApi = {
  /** Public — no token required */
  getInvite: (token: string) =>
    apiFetch<InviteInfo>(`/api/v1/auth/invite/${token}`),

  acceptInvite: (token: string, inviteToken: string) =>
    apiFetch<{ workspace_id: string }>(`/api/v1/auth/accept-invite/${inviteToken}`, {
      method: "POST",
      token,
    }),

  generateInvite: (token: string, workspaceId: string) =>
    apiFetch<{ invite_url: string }>(`/api/v1/auth/invite/${workspaceId}`, {
      method: "POST",
      token,
    }),
};

// ---------------------------------------------------------------------------
// Billing API
// ---------------------------------------------------------------------------

export const billingApi = {
  getStatus: (token: string, workspaceId: string) =>
    apiFetch<BillingStatus>(`/api/v1/billing/status/${workspaceId}`, { token }),

  createCheckout: (token: string, workspaceId: string) =>
    apiFetch<CheckoutResponse>("/api/v1/billing/checkout", {
      method: "POST",
      token,
      body: { workspace_id: workspaceId },
    }),

  createPortal: (token: string, workspaceId: string) =>
    apiFetch<PortalResponse>("/api/v1/billing/portal", {
      method: "POST",
      token,
      body: { workspace_id: workspaceId },
    }),
};

// ---------------------------------------------------------------------------
// Admin API
// ---------------------------------------------------------------------------

export const adminApi = {
  listUsers: (token: string) =>
    apiFetch<AdminUser[]>("/api/v1/admin/users", { token }),

  deleteUser: (token: string, userId: string) =>
    apiFetch<void>(`/api/v1/admin/users/${userId}`, { method: "DELETE", token }),

  listWorkspaces: (token: string) =>
    apiFetch<AdminWorkspace[]>("/api/v1/admin/workspaces", { token }),

  updateWorkspacePlan: (token: string, id: string, body: { tier: string }) =>
    apiFetch<AdminWorkspace>(`/api/v1/admin/workspaces/${id}/plan`, {
      method: "PATCH",
      token,
      body,
    }),

  listSubscriptions: (token: string) =>
    apiFetch<AdminSubscription[]>("/api/v1/admin/subscriptions", { token }),

  getStats: (token: string) =>
    apiFetch<AdminStats>("/api/v1/admin/stats", { token }),
};
