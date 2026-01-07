import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  Guest,
  CreateGuestRequest,
  UpdateGuestRequest,
  GuestListResponse,
  ApiResponse,
  CsvGuestRow,
  CsvImportResponse,
  CsvImportRowResult,
  SendInvitationsResponse,
  SendInvitationResult,
  GuestTag,
  TagListResponse,
  EmailOutbox,
  EmailOutboxResponse,
  EmailStatus,
} from '../types';
import { getAuthToken } from '../lib/auth';

interface GuestsProps {
  weddingId: string;
  onBack: () => void;
}

/**
 * Guests page component for managing wedding invitees.
 * PRD: "Admin can add invitees manually"
 */
/**
 * Email status info including bounce details for display
 */
interface EmailStatusInfo {
  status: EmailStatus;
  type: string;
  bounceType?: 'hard' | 'soft';
  bounceReason?: string;
}

/**
 * Get the latest email status for a guest by looking at all their outbox records.
 * Returns the most recent status with bounce details if applicable.
 */
function getLatestEmailStatus(guestId: string, emailOutbox: EmailOutbox[]): EmailStatusInfo | null {
  const guestEmails = emailOutbox
    .filter((e) => e.guestId === guestId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (guestEmails.length === 0) return null;

  // Return the most recent email status with bounce info
  const latest = guestEmails[0];
  return {
    status: latest.status,
    type: latest.emailType,
    bounceType: latest.bounceType,
    bounceReason: latest.bounceReason,
  };
}

export function Guests({ weddingId, onBack }: GuestsProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tags, setTags] = useState<GuestTag[]>([]);
  const [emailOutbox, setEmailOutbox] = useState<EmailOutbox[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [selectedGuestIds, setSelectedGuestIds] = useState<Set<string>>(new Set());
  const [showSendInvites, setShowSendInvites] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [filterTagIds, setFilterTagIds] = useState<string[]>([]);
  const [showAssignTags, setShowAssignTags] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

  const fetchEmailOutbox = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/invitations/outbox`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ApiResponse<EmailOutboxResponse> = await response.json();
      if (data.ok) {
        setEmailOutbox(data.data.emails);
      }
    } catch {
      // Silently fail, outbox is supplementary data
    }
  }, [weddingId]);

  const fetchTags = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/tags`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: ApiResponse<TagListResponse> = await response.json();
      if (data.ok) {
        setTags(data.data.tags);
      }
    } catch {
      // Silently fail, tags are optional
    }
  }, [weddingId]);

  const fetchGuests = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<GuestListResponse> = await response.json();

      if (data.ok) {
        setGuests(data.data.guests);
      } else {
        setError('Unable to load your guest list');
      }
    } catch {
      setError('Unable to load your guest list');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchGuests();
    fetchTags();
    fetchEmailOutbox();
  }, [fetchGuests, fetchTags, fetchEmailOutbox]);

  const handleGuestAdded = (newGuest: Guest) => {
    setGuests((prev) => [...prev, newGuest].sort((a, b) => a.name.localeCompare(b.name)));
    setShowAddForm(false);
  };

  const handleGuestDeleted = (guestId: string) => {
    setGuests((prev) => prev.filter((g) => g.id !== guestId));
  };

  const handleGuestUpdated = (updatedGuest: Guest) => {
    setGuests((prev) => prev.map((g) => (g.id === updatedGuest.id ? updatedGuest : g)));
    setEditingGuest(null);
  };

  const handleGuestsImported = (newGuests: Guest[]) => {
    setGuests((prev) => [...prev, ...newGuests].sort((a, b) => a.name.localeCompare(b.name)));
    setShowCsvImport(false);
  };

  const handleToggleSelect = (guestId: string) => {
    setSelectedGuestIds((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    // When filtering, select/deselect only the visible (filtered) guests
    const targetGuests = filterTagIds.length > 0 ? filteredGuests : guests;
    const allVisibleSelected = targetGuests.every((g) => selectedGuestIds.has(g.id));

    if (allVisibleSelected) {
      // Deselect all visible guests
      setSelectedGuestIds((prev) => {
        const next = new Set(prev);
        targetGuests.forEach((g) => next.delete(g.id));
        return next;
      });
    } else {
      // Select all visible guests (add to existing selection)
      setSelectedGuestIds((prev) => {
        const next = new Set(prev);
        targetGuests.forEach((g) => next.add(g.id));
        return next;
      });
    }
  };

  const handleInvitesSent = () => {
    setShowSendInvites(false);
    setSelectedGuestIds(new Set());
    fetchGuests(); // Refresh to update inviteSentAt
    fetchEmailOutbox(); // Refresh to update delivery status
  };

  const handleTagCreated = (tag: GuestTag) => {
    setTags((prev) => [...prev, tag]);
  };

  const handleTagDeleted = (tagId: string) => {
    setTags((prev) => prev.filter((t) => t.id !== tagId));
    // Also remove from filter if selected
    setFilterTagIds((prev) => prev.filter((id) => id !== tagId));
    // Refresh guests to update their tag assignments
    fetchGuests();
  };

  const handleTagsAssigned = () => {
    setShowAssignTags(false);
    setSelectedGuestIds(new Set());
    fetchGuests(); // Refresh to update tag assignments
  };

  const handleFilterChange = (tagId: string) => {
    setFilterTagIds((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const clearFilter = () => {
    setFilterTagIds([]);
  };

  const handleExportCsv = async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guests/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the CSV content
      const blob = await response.blob();

      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'guest-list.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently fail or show error toast
      console.error('Failed to export guest list');
    }
  };

  /**
   * Export filtered guests' emails for mail merge
   * PRD: "Admin can export email addresses for mailing"
   * Respects current tag filter and outputs simple Name,Email CSV
   */
  const handleExportEmails = () => {
    // Use filtered guests if filtering, otherwise use all guests
    const guestsToExport = filterTagIds.length > 0 ? filteredGuests : guests;

    if (guestsToExport.length === 0) return;

    // Escape CSV field (handle commas, quotes)
    const escapeCsvField = (value: string) => {
      if (!value) return '';
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    };

    // Build CSV content - simple format for mail merge
    const headers = ['Name', 'Email'];
    const rows = guestsToExport.map((guest) => [
      escapeCsvField(guest.name),
      escapeCsvField(guest.email),
    ]);

    const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

    // Create download link and trigger download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'email-list.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // Filter guests by selected tags
  const filteredGuests = filterTagIds.length > 0
    ? guests.filter((g) => g.tagIds?.some((tid) => filterTagIds.includes(tid)))
    : guests;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-neutral-600 hover:text-neutral-800 mb-4"
        >
          <ChevronLeftIcon className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl text-neutral-800">Your guests</h1>
            <p className="text-neutral-500 mt-1">
              Manage your wedding guest list
            </p>
          </div>
          <div className="flex gap-3">
            {selectedGuestIds.size > 0 && (
              <>
                <button
                  onClick={() => setShowAssignTags(true)}
                  className="btn-secondary flex items-center gap-2"
                >
                  <TagIcon className="w-4 h-4" />
                  Tag ({selectedGuestIds.size})
                </button>
                <button
                  onClick={() => setShowSendInvites(true)}
                  className="btn-primary flex items-center gap-2"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  Send invites ({selectedGuestIds.size})
                </button>
              </>
            )}
            <button
              onClick={() => setShowTagManager(true)}
              className="btn-secondary flex items-center gap-2"
            >
              <TagIcon className="w-4 h-4" />
              Tags
            </button>
            <button
              onClick={handleExportCsv}
              className="btn-secondary flex items-center gap-2"
              disabled={guests.length === 0}
            >
              <DownloadIcon className="w-4 h-4" />
              Export
            </button>
            <button
              onClick={handleExportEmails}
              className="btn-secondary flex items-center gap-2"
              disabled={filteredGuests.length === 0}
              title={filterTagIds.length > 0 ? `Export ${filteredGuests.length} filtered emails` : 'Export all emails'}
            >
              <MailIcon className="w-4 h-4" />
              Emails
            </button>
            <button
              onClick={() => setShowCsvImport(true)}
              className="btn-secondary"
              disabled={showCsvImport || showAddForm}
            >
              Import CSV
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="btn-primary"
              disabled={showAddForm || showCsvImport}
            >
              Add guest
            </button>
          </div>
        </div>
      </div>

      {showSendInvites && (
        <SendInvitesDialog
          weddingId={weddingId}
          guests={filteredGuests.filter((g) => selectedGuestIds.has(g.id))}
          onSuccess={handleInvitesSent}
          onCancel={() => setShowSendInvites(false)}
        />
      )}

      {showTagManager && (
        <TagManagerDialog
          weddingId={weddingId}
          tags={tags}
          onTagCreated={handleTagCreated}
          onTagDeleted={handleTagDeleted}
          onClose={() => setShowTagManager(false)}
        />
      )}

      {showAssignTags && (
        <AssignTagsDialog
          weddingId={weddingId}
          tags={tags}
          selectedGuestIds={Array.from(selectedGuestIds)}
          onSuccess={handleTagsAssigned}
          onCancel={() => setShowAssignTags(false)}
        />
      )}

      {showCsvImport && (
        <CsvImportForm
          weddingId={weddingId}
          onSuccess={handleGuestsImported}
          onCancel={() => setShowCsvImport(false)}
        />
      )}

      {showAddForm && (
        <AddGuestForm
          weddingId={weddingId}
          onSuccess={handleGuestAdded}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {editingGuest && (
        <EditGuestDialog
          weddingId={weddingId}
          guest={editingGuest}
          emailStatus={getLatestEmailStatus(editingGuest.id, emailOutbox)}
          onSuccess={handleGuestUpdated}
          onResend={() => fetchEmailOutbox()}
          onCancel={() => setEditingGuest(null)}
        />
      )}

      {error && (
        <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 mb-6">
          {error}
        </div>
      )}

      {/* Tag filter bar */}
      {tags.length > 0 && (
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-500">Filter by tag:</span>
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleFilterChange(tag.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                filterTagIds.includes(tag.id)
                  ? 'text-neutral-50'
                  : 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200'
              }`}
              style={filterTagIds.includes(tag.id) ? { backgroundColor: tag.color } : undefined}
            >
              {tag.name}
            </button>
          ))}
          {filterTagIds.length > 0 && (
            <button
              onClick={clearFilter}
              className="px-3 py-1 text-sm text-neutral-500 hover:text-neutral-700"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <LoadingState />
      ) : guests.length === 0 ? (
        <EmptyState onAddGuest={() => setShowAddForm(true)} />
      ) : filteredGuests.length === 0 ? (
        <div className="text-center py-8 text-neutral-500">
          No guests match the selected filter.{' '}
          <button onClick={clearFilter} className="text-primary-600 hover:underline">
            Clear filter
          </button>
        </div>
      ) : (
        <GuestList
          guests={filteredGuests}
          tags={tags}
          emailOutbox={emailOutbox}
          weddingId={weddingId}
          onDelete={handleGuestDeleted}
          onEdit={setEditingGuest}
          selectedIds={selectedGuestIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      )}
    </div>
  );
}

interface AddGuestFormProps {
  weddingId: string;
  onSuccess: (guest: Guest) => void;
  onCancel: () => void;
}

function AddGuestForm({ weddingId, onSuccess, onCancel }: AddGuestFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = name.trim() && email.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAuthToken();
      const body: CreateGuestRequest = {
        name: name.trim(),
        email: email.trim(),
      };

      const response = await fetch(`/api/weddings/${weddingId}/guests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data: ApiResponse<Guest> = await response.json();

      if (data.ok) {
        onSuccess(data.data);
      } else {
        if ('error' in data && data.error === 'GUEST_ALREADY_EXISTS') {
          setError('A guest with this email already exists');
        } else {
          setError('Unable to add guest. Please try again.');
        }
      }
    } catch {
      setError('Unable to add guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-6">
      <h3 className="text-lg text-neutral-800 mb-4">Add a new guest</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="guestName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Name
            </label>
            <input
              id="guestName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="guestEmail"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Email
            </label>
            <input
              id="guestEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {error && (
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSubmit || isSubmitting}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Adding...' : 'Add guest'}
          </button>
        </div>
      </form>
    </div>
  );
}

interface CsvImportFormProps {
  weddingId: string;
  onSuccess: (guests: Guest[]) => void;
  onCancel: () => void;
}

type ImportStep = 'upload' | 'map' | 'confirm' | 'results';

interface ParsedCsvData {
  headers: string[];
  rows: string[][];
}

interface ColumnMapping {
  nameColumn: number;
  emailColumn: number;
  partySizeColumn: number | null;
}

/**
 * CSV Import form with column mapping.
 * PRD: "Admin can import invitees via CSV"
 */
function CsvImportForm({ weddingId, onSuccess, onCancel }: CsvImportFormProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameColumn: 0,
    emailColumn: 1,
    partySizeColumn: null,
  });
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<CsvImportRowResult[] | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCsv = (text: string): ParsedCsvData => {
    const lines = text.trim().split('\n');
    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow).filter(row => row.some(cell => cell.trim()));
    return { headers, rows };
  };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCsv(text);

        if (parsed.headers.length < 2) {
          setError('CSV must have at least 2 columns (name and email)');
          return;
        }

        if (parsed.rows.length === 0) {
          setError('CSV file has no data rows');
          return;
        }

        setCsvData(parsed);

        // Auto-detect columns
        const lowerHeaders = parsed.headers.map(h => h.toLowerCase());
        const nameIdx = lowerHeaders.findIndex(h => h.includes('name'));
        const emailIdx = lowerHeaders.findIndex(h => h.includes('email') || h.includes('e-mail'));
        const partyIdx = lowerHeaders.findIndex(h => h.includes('party') || h.includes('size') || h.includes('guests'));

        setMapping({
          nameColumn: nameIdx >= 0 ? nameIdx : 0,
          emailColumn: emailIdx >= 0 ? emailIdx : 1,
          partySizeColumn: partyIdx >= 0 ? partyIdx : null,
        });

        setStep('map');
      } catch {
        setError('Unable to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleConfirm = () => {
    setStep('confirm');
  };

  const handleImport = async () => {
    if (!csvData) return;

    setIsImporting(true);
    setError(null);

    try {
      const guests: CsvGuestRow[] = csvData.rows.map(row => ({
        name: row[mapping.nameColumn] || '',
        email: row[mapping.emailColumn] || '',
        partySize: mapping.partySizeColumn !== null
          ? parseInt(row[mapping.partySizeColumn], 10) || 1
          : 1,
      }));

      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/guests/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guests }),
      });

      const data: ApiResponse<CsvImportResponse> = await response.json();

      if (data.ok) {
        setImportResults(data.data.results);
        setStep('results');

        // Extract successfully imported guests
        const importedGuests = data.data.results
          .filter(r => r.success && r.guest)
          .map(r => r.guest as Guest);

        if (importedGuests.length > 0) {
          onSuccess(importedGuests);
        }
      } else {
        setError('message' in data ? (data as { message?: string }).message || 'Import failed' : 'Import failed');
      }
    } catch {
      setError('Unable to import guests. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const previewGuests = csvData?.rows.slice(0, 5).map(row => ({
    name: row[mapping.nameColumn] || '(empty)',
    email: row[mapping.emailColumn] || '(empty)',
    partySize: mapping.partySizeColumn !== null
      ? row[mapping.partySizeColumn] || '1'
      : '1',
  })) || [];

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg text-neutral-800">Import guests from CSV</h3>
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <span className={step === 'upload' ? 'text-primary-600 font-medium' : ''}>Upload</span>
          <span>→</span>
          <span className={step === 'map' ? 'text-primary-600 font-medium' : ''}>Map columns</span>
          <span>→</span>
          <span className={step === 'confirm' ? 'text-primary-600 font-medium' : ''}>Confirm</span>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm mb-4">
          {error}
        </div>
      )}

      {step === 'upload' && (
        <div>
          <p className="text-neutral-600 text-sm mb-4">
            Upload a CSV file with your guest list. The file should have columns for name and email.
            Party size is optional.
          </p>
          <div className="border-2 border-dashed border-neutral-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />
            <DocumentIcon className="w-10 h-10 mx-auto text-neutral-400 mb-3" />
            <p className="text-neutral-600 mb-2">Drag and drop your CSV file here, or</p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary"
            >
              Browse files
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={onCancel} className="btn-secondary">
              Cancel
            </button>
          </div>
        </div>
      )}

      {step === 'map' && csvData && (
        <div>
          <p className="text-neutral-600 text-sm mb-4">
            Match your CSV columns to the guest fields. We detected {csvData.rows.length} rows.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Name column
              </label>
              <select
                value={mapping.nameColumn}
                onChange={(e) => setMapping({ ...mapping, nameColumn: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {csvData.headers.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Column ${idx + 1}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Email column
              </label>
              <select
                value={mapping.emailColumn}
                onChange={(e) => setMapping({ ...mapping, emailColumn: parseInt(e.target.value, 10) })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {csvData.headers.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Column ${idx + 1}`}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Party size column <span className="text-neutral-400">(optional)</span>
              </label>
              <select
                value={mapping.partySizeColumn ?? ''}
                onChange={(e) => setMapping({
                  ...mapping,
                  partySizeColumn: e.target.value ? parseInt(e.target.value, 10) : null,
                })}
                className="w-full px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">None</option>
                {csvData.headers.map((header, idx) => (
                  <option key={idx} value={idx}>{header || `Column ${idx + 1}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <p className="text-sm font-medium text-neutral-700 mb-2">Preview (first 5 rows)</p>
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100">
                  <tr>
                    <th className="px-3 py-2 text-left text-neutral-600">Name</th>
                    <th className="px-3 py-2 text-left text-neutral-600">Email</th>
                    <th className="px-3 py-2 text-left text-neutral-600">Party Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {previewGuests.map((guest, idx) => (
                    <tr key={idx}>
                      <td className="px-3 py-2 text-neutral-800">{guest.name}</td>
                      <td className="px-3 py-2 text-neutral-800">{guest.email}</td>
                      <td className="px-3 py-2 text-neutral-800">{guest.partySize}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setStep('upload')} className="btn-secondary">
              Back
            </button>
            <button type="button" onClick={handleConfirm} className="btn-primary">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 'confirm' && csvData && (
        <div>
          <p className="text-neutral-600 text-sm mb-4">
            Ready to import <strong>{csvData.rows.length}</strong> guests. Duplicates will be skipped.
          </p>
          <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 mb-6">
            <p className="text-accent-800 text-sm">
              Guests with invalid data or duplicate emails will be skipped.
              You'll see a summary after the import completes.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setStep('map')}
              className="btn-secondary"
              disabled={isImporting}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="btn-primary"
              disabled={isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${csvData.rows.length} guests`}
            </button>
          </div>
        </div>
      )}

      {step === 'results' && importResults && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className="w-6 h-6 text-accent-600" />
            <span className="text-lg text-neutral-800">Import complete</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-accent-700">
                {importResults.filter(r => r.success).length}
              </p>
              <p className="text-sm text-accent-600">Imported</p>
            </div>
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-neutral-700">
                {importResults.filter(r => !r.success).length}
              </p>
              <p className="text-sm text-neutral-600">Skipped</p>
            </div>
          </div>

          {importResults.some(r => !r.success) && (
            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Skipped rows</p>
              <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-neutral-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-neutral-600">Row</th>
                      <th className="px-3 py-2 text-left text-neutral-600">Name</th>
                      <th className="px-3 py-2 text-left text-neutral-600">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {importResults.filter(r => !r.success).map((result, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-neutral-800">{result.row}</td>
                        <td className="px-3 py-2 text-neutral-800">{result.name || '(empty)'}</td>
                        <td className="px-3 py-2 text-neutral-500">{result.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button type="button" onClick={onCancel} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface EditGuestDialogProps {
  weddingId: string;
  guest: Guest;
  emailStatus: EmailStatusInfo | null;
  onSuccess: (guest: Guest) => void;
  onResend?: () => void;
  onCancel: () => void;
}

/**
 * Edit guest dialog component.
 * PRD: "Admin can configure plus-one allowance per guest"
 * PRD: "Admin can see bounce and failure status" - includes ability to update email and resend
 */
function EditGuestDialog({ weddingId, guest, emailStatus, onSuccess, onResend, onCancel }: EditGuestDialogProps) {
  const [name, setName] = useState(guest.name);
  const [email, setEmail] = useState(guest.email);
  const [plusOneAllowance, setPlusOneAllowance] = useState(guest.plusOneAllowance ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  const canSubmit = name.trim() && email.trim();
  const emailChanged = email.trim() !== guest.email;
  const hasBounceOrFailure = emailStatus && (emailStatus.status === 'bounced' || emailStatus.status === 'failed');

  const handleSubmit = async (e: React.FormEvent, shouldResend = false) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError(null);
    setResendSuccess(false);

    try {
      const token = getAuthToken();
      const body: UpdateGuestRequest = {
        name: name.trim(),
        email: email.trim(),
        plusOneAllowance,
      };

      const response = await fetch(`/api/weddings/${weddingId}/guests/${guest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data: ApiResponse<Guest> = await response.json();

      if (data.ok) {
        // If user wants to resend after save
        if (shouldResend) {
          setIsSubmitting(false);
          setIsResending(true);
          try {
            const resendResponse = await fetch(`/api/weddings/${weddingId}/invitations/send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ guestIds: [guest.id] }),
            });
            const resendData: ApiResponse<SendInvitationsResponse> = await resendResponse.json();
            if (resendData.ok && resendData.data.sent > 0) {
              setResendSuccess(true);
              // Brief delay to show success before closing
              setTimeout(() => {
                onSuccess(data.data);
                if (onResend) onResend();
              }, 1000);
              return;
            } else {
              setError('Saved, but failed to resend invitation. Please try again.');
            }
          } catch {
            setError('Saved, but failed to resend invitation. Please try again.');
          } finally {
            setIsResending(false);
          }
        } else {
          onSuccess(data.data);
        }
      } else {
        setError('Unable to update guest. Please try again.');
      }
    } catch {
      setError('Unable to update guest. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
      <div className="bg-neutral-50 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg text-neutral-800">Edit guest</h3>
          <button
            onClick={onCancel}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Show bounce/failure alert with helpful message */}
        {hasBounceOrFailure && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {emailStatus.status === 'bounced' ? 'Email bounced' : 'Delivery failed'}
                </p>
                <p className="text-sm text-red-700 mt-1">
                  {emailStatus.bounceReason
                    ? `Reason: ${emailStatus.bounceReason}`
                    : emailStatus.status === 'bounced'
                      ? 'The email address appears to be invalid or unreachable.'
                      : 'The invitation could not be delivered.'}
                </p>
                <p className="text-sm text-red-600 mt-2">
                  Update the email address below and click "Save & Resend" to try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Show resend success message */}
        {resendSuccess && (
          <div className="mb-4 p-3 bg-accent-50 border border-accent-200 rounded-lg flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-accent-600" />
            <p className="text-sm text-accent-800">Invitation resent successfully!</p>
          </div>
        )}

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          <div>
            <label
              htmlFor="editGuestName"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Name
            </label>
            <input
              id="editGuestName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Smith"
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>
          <div>
            <label
              htmlFor="editGuestEmail"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Email
              {hasBounceOrFailure && (
                <span className="ml-2 text-xs text-red-600 font-normal">(needs update)</span>
              )}
            </label>
            <input
              id="editGuestEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                hasBounceOrFailure && !emailChanged
                  ? 'border-red-300 bg-red-50'
                  : 'border-neutral-200'
              }`}
            />
            {hasBounceOrFailure && emailChanged && (
              <p className="text-xs text-accent-600 mt-1">✓ Email updated</p>
            )}
          </div>
          <div>
            <label
              htmlFor="editPlusOneAllowance"
              className="block text-sm font-medium text-neutral-700 mb-1"
            >
              Plus-one allowance
            </label>
            <p className="text-xs text-neutral-500 mb-2">
              Number of additional guests this person can bring (0 = no plus-ones)
            </p>
            <input
              id="editPlusOneAllowance"
              type="number"
              min="0"
              max="10"
              value={plusOneAllowance}
              onChange={(e) => setPlusOneAllowance(parseInt(e.target.value, 10) || 0)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary"
              disabled={isSubmitting || isResending}
            >
              Cancel
            </button>
            {/* Show "Save & Resend" button when there was a bounce/failure */}
            {hasBounceOrFailure && (
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={!canSubmit || isSubmitting || isResending}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isResending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-neutral-50 border-t-transparent rounded-full animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <EnvelopeIcon className="w-4 h-4" />
                    Save & Resend
                  </>
                )}
              </button>
            )}
            <button
              type="submit"
              disabled={!canSubmit || isSubmitting || isResending}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : 'Save only'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ExclamationTriangleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
      />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

interface GuestListProps {
  guests: Guest[];
  tags: GuestTag[];
  emailOutbox: EmailOutbox[];
  weddingId: string;
  onDelete: (guestId: string) => void;
  onEdit: (guest: Guest) => void;
  selectedIds: Set<string>;
  onToggleSelect: (guestId: string) => void;
  onSelectAll: () => void;
}

function GuestList({
  guests,
  tags,
  emailOutbox,
  weddingId,
  onDelete,
  onEdit,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}: GuestListProps) {
  // Check if all visible guests are selected (not comparing raw sizes since selection may include guests from other filters)
  const visibleSelectedCount = guests.filter((g) => selectedIds.has(g.id)).length;
  const allSelected = guests.length > 0 && visibleSelectedCount === guests.length;
  const someSelected = visibleSelectedCount > 0 && visibleSelectedCount < guests.length;

  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onSelectAll}
            className="flex items-center gap-2 text-sm text-neutral-600 hover:text-neutral-800"
          >
            <CheckboxIcon checked={allSelected} indeterminate={someSelected} />
            {allSelected ? 'Deselect all' : 'Select all'}
          </button>
          <span className="text-sm text-neutral-500">
            {guests.length} {guests.length === 1 ? 'guest' : 'guests'}
            {visibleSelectedCount > 0 && ` (${visibleSelectedCount} selected)`}
          </span>
        </div>
      </div>
      <ul className="divide-y divide-neutral-200">
        {guests.map((guest) => (
          <GuestRow
            key={guest.id}
            guest={guest}
            tags={tags}
            emailStatus={getLatestEmailStatus(guest.id, emailOutbox)}
            weddingId={weddingId}
            onDelete={onDelete}
            onEdit={onEdit}
            isSelected={selectedIds.has(guest.id)}
            onToggleSelect={() => onToggleSelect(guest.id)}
          />
        ))}
      </ul>
    </div>
  );
}

interface GuestRowProps {
  guest: Guest;
  tags: GuestTag[];
  emailStatus: EmailStatusInfo | null;
  weddingId: string;
  onDelete: (guestId: string) => void;
  onEdit: (guest: Guest) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

function GuestRow({ guest, tags, emailStatus, weddingId, onDelete, onEdit, isSelected, onToggleSelect }: GuestRowProps) {
  // Get the tags for this guest
  const guestTags = tags.filter((t) => guest.tagIds?.includes(t.id));
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to remove this guest?')) return;

    setIsDeleting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/guests/${guest.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (response.ok) {
        onDelete(guest.id);
      }
    } catch {
      // Silently fail, guest remains in list
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <li className="px-4 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSelect}
          className="flex-shrink-0"
        >
          <CheckboxIcon checked={isSelected} />
        </button>
        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
          <span className="text-primary-700 font-medium">
            {guest.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-neutral-800 font-medium">{guest.name}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-neutral-500">{guest.email}</p>
            {guestTags.length > 0 && (
              <div className="flex gap-1">
                {guestTags.map((tag) => (
                  <span
                    key={tag.id}
                    className="px-1.5 py-0.5 rounded text-xs text-neutral-50"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <InviteStatusBadge emailStatus={emailStatus} inviteSentAt={guest.inviteSentAt} />
        <RsvpStatusBadge status={guest.rsvpStatus} />
        <button
          onClick={() => onEdit(guest)}
          className="text-neutral-400 hover:text-primary-600 p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          title="Edit guest"
        >
          <PencilIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="text-neutral-400 hover:text-primary-600 p-2 rounded-lg hover:bg-neutral-100 transition-colors disabled:opacity-50"
          title="Remove guest"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
}

/**
 * InviteStatusBadge component shows the delivery status of the invitation email.
 * PRD: "Admin can see invite delivery status" and "Admin can see bounce and failure status"
 */
function InviteStatusBadge({
  emailStatus,
  inviteSentAt,
}: {
  emailStatus: EmailStatusInfo | null;
  inviteSentAt?: string;
}) {
  // No invitation has been attempted
  if (!emailStatus && !inviteSentAt) {
    return null;
  }

  // Show detailed status from email outbox
  if (emailStatus) {
    const statusConfig: Record<
      EmailStatus,
      { className: string; label: string; icon: React.ReactNode }
    > = {
      delivered: {
        className: 'bg-accent-100 text-accent-700',
        label: 'Delivered',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ),
      },
      sent: {
        className: 'bg-amber-100 text-amber-700',
        label: 'Sent',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        ),
      },
      pending: {
        className: 'bg-amber-100 text-amber-700',
        label: 'Sending',
        icon: (
          <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
          </svg>
        ),
      },
      bounced: {
        className: 'bg-red-100 text-red-700',
        label: emailStatus.bounceType === 'hard' ? 'Bounced' : 'Soft bounce',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ),
      },
      failed: {
        className: 'bg-primary-100 text-primary-700',
        label: 'Failed',
        icon: (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        ),
      },
    };

    const config = statusConfig[emailStatus.status];

    // Build tooltip with bounce reason if available
    let tooltip = `${emailStatus.type === 'reminder' ? 'Reminder' : 'Invitation'} ${emailStatus.status}`;
    if (emailStatus.status === 'bounced' && emailStatus.bounceReason) {
      tooltip += `: ${emailStatus.bounceReason}`;
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.className}`}
        title={tooltip}
      >
        {config.icon}
        {config.label}
      </span>
    );
  }

  // Fallback: inviteSentAt exists but no outbox record (shouldn't happen normally)
  return (
    <span className="text-xs text-neutral-400">
      Invited
    </span>
  );
}

function RsvpStatusBadge({ status }: { status: string }) {
  const styles = {
    pending: 'bg-neutral-100 text-neutral-600',
    attending: 'bg-accent-100 text-accent-700',
    not_attending: 'bg-primary-100 text-primary-700',
  };

  const labels = {
    pending: 'No response',
    attending: 'Attending',
    not_attending: 'Not attending',
  };

  return (
    <span
      className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status as keyof typeof styles] || styles.pending}`}
    >
      {labels[status as keyof typeof labels] || 'No response'}
    </span>
  );
}

interface EmptyStateProps {
  onAddGuest: () => void;
}

function EmptyState({ onAddGuest }: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-6 bg-neutral-50 border border-neutral-200 rounded-lg">
      <div className="w-14 h-14 mx-auto rounded-full bg-primary-100 flex items-center justify-center mb-4">
        <UsersIcon className="w-7 h-7 text-primary-500" />
      </div>
      <h3 className="text-lg text-neutral-800 mb-2">No guests yet</h3>
      <p className="text-neutral-500 mb-6 max-w-sm mx-auto">
        Start building your guest list by adding your first invitee
      </p>
      <button onClick={onAddGuest} className="btn-primary">
        Add your first guest
      </button>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="text-center py-12">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-neutral-500">Loading guests...</p>
    </div>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 19.5L8.25 12l7.5-7.5"
      />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
      />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  );
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
      />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  );
}

function CheckboxIcon({ checked, indeterminate }: { checked: boolean; indeterminate?: boolean }) {
  if (indeterminate) {
    return (
      <div className="w-5 h-5 rounded border-2 border-primary-500 bg-primary-500 flex items-center justify-center">
        <div className="w-2.5 h-0.5 bg-neutral-50 rounded" />
      </div>
    );
  }
  if (checked) {
    return (
      <div className="w-5 h-5 rounded border-2 border-primary-500 bg-primary-500 flex items-center justify-center">
        <svg className="w-3 h-3 text-neutral-50" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded border-2 border-neutral-300 bg-neutral-50" />
  );
}

interface SendInvitesDialogProps {
  weddingId: string;
  guests: Guest[];
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Send invitations dialog component.
 * PRD: "Admin can send invitation emails"
 */
function SendInvitesDialog({ weddingId, guests, onSuccess, onCancel }: SendInvitesDialogProps) {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SendInvitationResult[] | null>(null);

  const handleSend = async () => {
    setIsSending(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/invitations/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestIds: guests.map((g) => g.id) }),
      });

      const data: ApiResponse<SendInvitationsResponse> = await response.json();

      if (data.ok) {
        setResults(data.data.results);
      } else {
        setError('message' in data ? (data as { message?: string }).message || 'Failed to send invitations' : 'Failed to send invitations');
      }
    } catch {
      setError('Unable to send invitations. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  // Results view
  if (results) {
    const sent = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;

    return (
      <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
        <div className="bg-neutral-50 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircleIcon className="w-6 h-6 text-accent-600" />
            <h3 className="text-lg text-neutral-800">Invitations sent</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-accent-50 border border-accent-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-accent-700">{sent}</p>
              <p className="text-sm text-accent-600">Sent successfully</p>
            </div>
            <div className="bg-neutral-100 border border-neutral-200 rounded-lg p-4 text-center">
              <p className="text-2xl font-semibold text-neutral-700">{failed}</p>
              <p className="text-sm text-neutral-600">Failed</p>
            </div>
          </div>

          {failed > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-neutral-700 mb-2">Failed invitations</p>
              <div className="border border-neutral-200 rounded-lg overflow-hidden max-h-32 overflow-y-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-neutral-200">
                    {results.filter((r) => !r.success).map((result, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-neutral-800">{result.guestName}</td>
                        <td className="px-3 py-2 text-neutral-500">{result.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button onClick={onSuccess} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Confirmation view
  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
      <div className="bg-neutral-50 rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
        <h3 className="text-lg text-neutral-800 mb-2">Send invitations</h3>
        <p className="text-neutral-600 mb-6">
          You're about to send invitation emails to <strong>{guests.length}</strong> {guests.length === 1 ? 'guest' : 'guests'}.
          Each guest will receive a personalized email with their unique RSVP link.
        </p>

        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 mb-6 max-h-48 overflow-y-auto">
          <ul className="space-y-2">
            {guests.map((guest) => (
              <li key={guest.id} className="flex items-center gap-2 text-sm">
                <EnvelopeIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
                <span className="text-neutral-800">{guest.name}</span>
                <span className="text-neutral-400">({guest.email})</span>
              </li>
            ))}
          </ul>
        </div>

        {error && (
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="btn-primary flex items-center gap-2"
            disabled={isSending}
          >
            {isSending ? (
              <>
                <div className="w-4 h-4 border-2 border-neutral-50 border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <EnvelopeIcon className="w-4 h-4" />
                Send {guests.length} {guests.length === 1 ? 'invitation' : 'invitations'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Tag Management Components
// ============================================================================

function TagIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h.008v.008H6V6z"
      />
    </svg>
  );
}

interface TagManagerDialogProps {
  weddingId: string;
  tags: GuestTag[];
  onTagCreated: (tag: GuestTag) => void;
  onTagDeleted: (tagId: string) => void;
  onClose: () => void;
}

/**
 * Tag manager dialog for creating and managing tags.
 * PRD: "Admin can create guest tags for segmentation"
 */
function TagManagerDialog({
  weddingId,
  tags,
  onTagCreated,
  onTagDeleted,
  onClose,
}: TagManagerDialogProps) {
  const [newTagName, setNewTagName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newTagName.trim() }),
      });

      const data: ApiResponse<GuestTag> = await response.json();

      if (data.ok) {
        onTagCreated(data.data);
        setNewTagName('');
      } else {
        setError('error' in data && data.error === 'TAG_ALREADY_EXISTS'
          ? 'A tag with this name already exists'
          : 'Unable to create tag');
      }
    } catch {
      setError('Unable to create tag');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTag = async (tagId: string) => {
    if (!confirm('Delete this tag? It will be removed from all guests.')) return;

    setDeletingTagId(tagId);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/tags/${tagId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        onTagDeleted(tagId);
      }
    } catch {
      // Silently fail
    } finally {
      setDeletingTagId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
      <div className="bg-neutral-50 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg text-neutral-800">Manage tags</h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-600"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Create new tag */}
        <div className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name (e.g., Bride's side)"
              className="flex-1 px-3 py-2 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
            />
            <button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || isCreating}
              className="btn-primary disabled:opacity-50"
            >
              {isCreating ? 'Creating...' : 'Add'}
            </button>
          </div>
          {error && (
            <p className="text-sm text-primary-600 mt-2">{error}</p>
          )}
        </div>

        {/* Tag list */}
        {tags.length === 0 ? (
          <p className="text-neutral-500 text-center py-4">
            No tags yet. Create one above.
          </p>
        ) : (
          <ul className="space-y-2">
            {tags.map((tag) => (
              <li
                key={tag.id}
                className="flex items-center justify-between p-3 bg-neutral-100 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  <span className="text-neutral-800">{tag.name}</span>
                </div>
                <button
                  onClick={() => handleDeleteTag(tag.id)}
                  disabled={deletingTagId === tag.id}
                  className="text-neutral-400 hover:text-primary-600 disabled:opacity-50"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

interface AssignTagsDialogProps {
  weddingId: string;
  tags: GuestTag[];
  selectedGuestIds: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Dialog for assigning tags to selected guests.
 * PRD: "Admin can create guest tags for segmentation"
 */
function AssignTagsDialog({
  weddingId,
  tags,
  selectedGuestIds,
  onSuccess,
  onCancel,
}: AssignTagsDialogProps) {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTag = (tagId: string) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedTagIds.size === 0) return;

    setIsAssigning(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/tags/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          guestIds: selectedGuestIds,
          tagIds: Array.from(selectedTagIds),
        }),
      });

      const data: ApiResponse<{ updated: number }> = await response.json();

      if (data.ok) {
        onSuccess();
      } else {
        setError('Unable to assign tags');
      }
    } catch {
      setError('Unable to assign tags');
    } finally {
      setIsAssigning(false);
    }
  };

  if (tags.length === 0) {
    return (
      <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
        <div className="bg-neutral-50 rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
          <h3 className="text-lg text-neutral-800 mb-4">No tags available</h3>
          <p className="text-neutral-600 mb-6">
            Create some tags first using the "Tags" button.
          </p>
          <div className="flex justify-end">
            <button onClick={onCancel} className="btn-primary">
              Got it
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-neutral-900/50 flex items-center justify-center z-50">
      <div className="bg-neutral-50 rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg text-neutral-800 mb-2">Assign tags</h3>
        <p className="text-neutral-600 mb-6">
          Select tags to add to {selectedGuestIds.length} selected{' '}
          {selectedGuestIds.length === 1 ? 'guest' : 'guests'}.
        </p>

        <div className="space-y-2 mb-6">
          {tags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => toggleTag(tag.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                selectedTagIds.has(tag.id)
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-neutral-200 hover:border-neutral-300'
              }`}
            >
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: tag.color }}
              />
              <span className="text-neutral-800">{tag.name}</span>
              {selectedTagIds.has(tag.id) && (
                <CheckCircleIcon className="w-5 h-5 text-primary-500 ml-auto" />
              )}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary" disabled={isAssigning}>
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={selectedTagIds.size === 0 || isAssigning}
            className="btn-primary disabled:opacity-50"
          >
            {isAssigning ? 'Assigning...' : `Assign ${selectedTagIds.size} tag${selectedTagIds.size !== 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * Mail icon for email export button
 * PRD: "Admin can export email addresses for mailing"
 */
function MailIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V17.25z"
      />
    </svg>
  );
}
