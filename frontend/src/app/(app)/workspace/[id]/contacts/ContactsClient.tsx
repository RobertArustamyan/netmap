"use client";

import { useState, useMemo } from "react";
import ContactForm from "./ContactForm";

export interface ContactRead {
  id: string;
  workspace_id: string;
  added_by_user_id: string | null;
  name: string;
  job_title: string | null;
  company: string | null;
  linkedin_url: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  workspaceId: string;
  initialContacts: ContactRead[];
}

export default function ContactsClient({ workspaceId, initialContacts }: Props) {
  const [contacts, setContacts] = useState<ContactRead[]>(initialContacts);
  const [search, setSearch] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ContactRead | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? "").toLowerCase().includes(q) ||
        (c.job_title ?? "").toLowerCase().includes(q)
    );
  }, [contacts, search]);

  function openAdd() {
    setEditing(null);
    setPanelOpen(true);
  }

  function openEdit(contact: ContactRead) {
    setEditing(contact);
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditing(null);
  }

  function handleSave(contact: ContactRead) {
    if (editing) {
      setContacts((prev) =>
        prev.map((c) => (c.id === contact.id ? contact : c))
      );
    } else {
      setContacts((prev) => [contact, ...prev]);
    }
    closePanel();
  }

  function handleDelete() {
    if (!editing) return;
    setContacts((prev) => prev.filter((c) => c.id !== editing.id));
    closePanel();
  }

  return (
    <div className="px-6 py-8 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, company, or title…"
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={openAdd}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Add contact
        </button>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground mb-4">
        {contacts.length} {contacts.length === 1 ? "contact" : "contacts"}
      </p>

      {/* Table */}
      {contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">
            No contacts yet. Add your first contact.
          </p>
          <button
            onClick={openAdd}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add contact
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center py-24">
          <p className="text-muted-foreground text-sm">
            No contacts match your search.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">
                  Title
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">
                  Company
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">
                  Email
                </th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden xl:table-cell">
                  Added
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  onClick={() => openEdit(contact)}
                  className="hover:bg-accent/40 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-foreground">
                    {contact.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {contact.job_title ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    {contact.company ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                    {contact.email ?? <span className="text-border">—</span>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden xl:table-cell">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Side panel overlay */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/30"
            onClick={closePanel}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-background border-l border-border shadow-xl flex flex-col">
            {/* Panel header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <h2 className="text-base font-semibold text-foreground">
                {editing ? "Edit contact" : "Add contact"}
              </h2>
              <button
                onClick={closePanel}
                aria-label="Close panel"
                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto px-6 py-6">
              <ContactForm
                workspaceId={workspaceId}
                contact={editing ?? undefined}
                onSave={handleSave}
                onDelete={editing ? handleDelete : undefined}
                onCancel={closePanel}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
