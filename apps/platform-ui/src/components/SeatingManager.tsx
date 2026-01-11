import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  SeatingTable,
  SeatingOverviewResponse,
  CreateTableRequest,
  ApiResponse,
} from '../types';

interface SeatingManagerProps {
  weddingId: string;
}

/**
 * Seating management component for admin dashboard.
 * PRD: "Admin can create table assignments"
 * PRD: "Admin can assign guests to tables"
 */
export function SeatingManager({ weddingId }: SeatingManagerProps) {
  const [overview, setOverview] = useState<SeatingOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(8);
  const [newTableNotes, setNewTableNotes] = useState('');
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [selectedUnassignedGuests, setSelectedUnassignedGuests] = useState<Set<string>>(new Set());
  const [isAssigning, setIsAssigning] = useState(false);
  const [editingTable, setEditingTable] = useState<SeatingTable | null>(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState(8);
  const [editNotes, setEditNotes] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/seating`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<SeatingOverviewResponse> = await response.json();

      if (data.ok) {
        setOverview(data.data);
      } else {
        setError('Unable to load seating information');
      }
    } catch {
      setError('Unable to load seating information');
    }
  }, [weddingId]);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      await fetchOverview();
      setIsLoading(false);
    };
    loadData();
  }, [fetchOverview]);

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableName.trim() || newTableCapacity < 1) return;

    setIsCreating(true);
    try {
      const token = getAuthToken();
      const request: CreateTableRequest = {
        name: newTableName.trim(),
        capacity: newTableCapacity,
        notes: newTableNotes.trim() || undefined,
      };

      const response = await fetch(`/api/weddings/${weddingId}/seating/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (data.ok) {
        setNewTableName('');
        setNewTableCapacity(8);
        setNewTableNotes('');
        await fetchOverview();
      } else {
        setError('Unable to create table');
      }
    } catch {
      setError('Unable to create table');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTable = async (tableId: string) => {
    if (!confirm('Are you sure you want to delete this table? All guests will be unassigned.')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/seating/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.ok) {
        await fetchOverview();
        if (selectedTableId === tableId) {
          setSelectedTableId(null);
        }
      } else {
        setError('Unable to delete table');
      }
    } catch {
      setError('Unable to delete table');
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable || !editName.trim() || editCapacity < 1) return;

    try {
      const token = getAuthToken();
      const response = await fetch(
        `/api/weddings/${weddingId}/seating/tables/${editingTable.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: editName.trim(),
            capacity: editCapacity,
            notes: editNotes.trim() || undefined,
          }),
        },
      );

      const data = await response.json();

      if (data.ok) {
        setEditingTable(null);
        await fetchOverview();
      } else {
        setError(data.error === 'TABLE_CAPACITY_EXCEEDED'
          ? 'Cannot reduce capacity below assigned guest count'
          : 'Unable to update table');
      }
    } catch {
      setError('Unable to update table');
    }
  };

  const handleAssignGuests = async () => {
    if (!selectedTableId || selectedUnassignedGuests.size === 0) return;

    setIsAssigning(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/seating/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableId: selectedTableId,
          guestIds: Array.from(selectedUnassignedGuests),
        }),
      });

      const data = await response.json();

      if (data.ok) {
        setSelectedUnassignedGuests(new Set());
        await fetchOverview();
        if (data.data.errors?.length > 0) {
          const capacityErrors = data.data.errors.filter(
            (e: { error: string }) => e.error === 'TABLE_CAPACITY_EXCEEDED'
          );
          if (capacityErrors.length > 0) {
            setError(`${data.data.assigned.length} assigned, ${capacityErrors.length} couldn't fit (table full)`);
          }
        }
      } else {
        setError('Unable to assign guests');
      }
    } catch {
      setError('Unable to assign guests');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleUnassignGuest = async (guestId: string) => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/seating/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ guestIds: [guestId] }),
      });

      const data = await response.json();

      if (data.ok) {
        await fetchOverview();
      } else {
        setError('Unable to unassign guest');
      }
    } catch {
      setError('Unable to unassign guest');
    }
  };

  const toggleUnassignedGuest = (guestId: string) => {
    const newSet = new Set(selectedUnassignedGuests);
    if (newSet.has(guestId)) {
      newSet.delete(guestId);
    } else {
      newSet.add(guestId);
    }
    setSelectedUnassignedGuests(newSet);
  };

  const startEditingTable = (table: SeatingTable) => {
    setEditingTable(table);
    setEditName(table.name);
    setEditCapacity(table.capacity);
    setEditNotes(table.notes || '');
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="animate-spin inline-block w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full" />
        <p className="mt-4 text-neutral-dark/60">Loading seating information...</p>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="p-8 text-center">
        <p className="text-primary">{error}</p>
      </div>
    );
  }

  const selectedTable = selectedTableId
    ? overview?.tables.find((t) => t.table.id === selectedTableId)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="font-serif text-2xl text-neutral-dark">Seating Chart</h2>
        </div>
      </div>

      {error && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 text-primary">
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-4 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary Cards */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-dark/60">Tables</p>
            <p className="text-2xl font-serif text-neutral-dark">
              {overview.summary.totalTables}
            </p>
          </div>
          <div className="bg-neutral-50 rounded-lg p-4">
            <p className="text-sm text-neutral-dark/60">Total Capacity</p>
            <p className="text-2xl font-serif text-neutral-dark">
              {overview.summary.totalCapacity}
            </p>
          </div>
          <div className="bg-accent/10 rounded-lg p-4">
            <p className="text-sm text-accent/80">Assigned</p>
            <p className="text-2xl font-serif text-accent">
              {overview.summary.totalAssigned}
            </p>
          </div>
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-sm text-primary/80">Unassigned</p>
            <p className="text-2xl font-serif text-primary">
              {overview.summary.totalUnassigned}
            </p>
          </div>
        </div>
      )}

      {/* Create Table Form */}
      <div className="bg-neutral-50 rounded-lg p-6">
        <h3 className="font-serif text-lg text-neutral-dark mb-4">Add a table</h3>
        <form onSubmit={handleCreateTable} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-neutral-dark/60 mb-1">Table name</label>
            <input
              type="text"
              value={newTableName}
              onChange={(e) => setNewTableName(e.target.value)}
              placeholder="e.g., Table 1, Head Table"
              className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-dark/60 mb-1">Capacity</label>
            <input
              type="number"
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(parseInt(e.target.value) || 1)}
              min={1}
              max={50}
              className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-dark/60 mb-1">Notes (optional)</label>
            <input
              type="text"
              value={newTableNotes}
              onChange={(e) => setNewTableNotes(e.target.value)}
              placeholder="e.g., Near dance floor"
              className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isCreating || !newTableName.trim()}
              className="w-full px-4 py-2 bg-primary text-neutral-50 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isCreating ? 'Adding...' : 'Add table'}
            </button>
          </div>
        </form>
      </div>

      {/* Two-column layout: Tables and Unassigned Guests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tables Column */}
        <div className="space-y-4">
          <h3 className="font-serif text-lg text-neutral-dark">Tables</h3>
          {overview?.tables.length === 0 ? (
            <div className="bg-neutral-50 rounded-lg p-8 text-center">
              <p className="text-neutral-dark/60">No tables yet. Add your first table above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {overview?.tables.map(({ table, guests, availableSeats }) => (
                <div
                  key={table.id}
                  className={`bg-neutral-50 rounded-lg p-4 border-2 transition-colors cursor-pointer ${
                    selectedTableId === table.id
                      ? 'border-primary'
                      : 'border-transparent hover:border-neutral-dark/20'
                  }`}
                  onClick={() => setSelectedTableId(selectedTableId === table.id ? null : table.id)}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-serif text-lg text-neutral-dark">{table.name}</h4>
                      <p className="text-sm text-neutral-dark/60">
                        {guests.length} / {table.capacity} seats filled
                        {availableSeats > 0 && (
                          <span className="ml-2 text-accent">({availableSeats} available)</span>
                        )}
                      </p>
                      {table.notes && (
                        <p className="text-sm text-neutral-dark/50 mt-1">{table.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          startEditingTable(table);
                        }}
                        className="p-1 text-neutral-dark/40 hover:text-neutral-dark transition-colors"
                        title="Edit table"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTable(table.id);
                        }}
                        className="p-1 text-neutral-dark/40 hover:text-primary transition-colors"
                        title="Delete table"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {/* Assigned guests */}
                  {guests.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-dark/10">
                      <div className="flex flex-wrap gap-2">
                        {guests.map((guest) => (
                          <span
                            key={guest.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-accent/20 text-accent rounded-full text-sm"
                          >
                            {guest.name}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleUnassignGuest(guest.id);
                              }}
                              className="ml-1 hover:text-primary transition-colors"
                              title="Remove from table"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Unassigned Guests Column */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg text-neutral-dark">
              Unassigned Guests
              <span className="ml-2 text-sm text-neutral-dark/60 font-sans">
                (attending only)
              </span>
            </h3>
            {selectedTableId && selectedUnassignedGuests.size > 0 && (
              <button
                onClick={handleAssignGuests}
                disabled={isAssigning}
                className="px-4 py-2 bg-primary text-neutral-50 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                {isAssigning
                  ? 'Assigning...'
                  : `Assign ${selectedUnassignedGuests.size} to ${selectedTable?.table.name || 'table'}`}
              </button>
            )}
          </div>

          {!selectedTableId && overview && overview.unassignedGuests.length > 0 && (
            <p className="text-sm text-neutral-dark/60 bg-neutral-50 rounded-lg p-4">
              Select a table first, then select guests to assign.
            </p>
          )}

          {overview?.unassignedGuests.length === 0 ? (
            <div className="bg-accent/10 rounded-lg p-8 text-center">
              <p className="text-accent">All attending guests have been assigned to tables!</p>
            </div>
          ) : (
            <div className="bg-neutral-50 rounded-lg p-4 max-h-96 overflow-y-auto">
              <div className="space-y-2">
                {overview?.unassignedGuests.map((guest) => (
                  <label
                    key={guest.id}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedTableId
                        ? 'hover:bg-neutral-100'
                        : 'opacity-60 cursor-not-allowed'
                    } ${
                      selectedUnassignedGuests.has(guest.id) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedUnassignedGuests.has(guest.id)}
                      onChange={() => toggleUnassignedGuest(guest.id)}
                      disabled={!selectedTableId}
                      className="w-4 h-4 text-primary border-neutral-dark/20 rounded focus:ring-primary"
                    />
                    <span className="text-neutral-dark">{guest.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Table Modal */}
      {editingTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-neutral-50 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="font-serif text-xl text-neutral-dark mb-4">Edit Table</h3>
            <form onSubmit={handleUpdateTable} className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-dark/60 mb-1">Table name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-dark/60 mb-1">Capacity</label>
                <input
                  type="number"
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                  min={1}
                  max={50}
                  className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-dark/60 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-2 border border-neutral-dark/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingTable(null)}
                  className="flex-1 px-4 py-2 border border-neutral-dark/20 text-neutral-dark rounded-lg hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-neutral-50 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
