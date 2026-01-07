import { useState, useEffect, useCallback } from 'react';
import { SongRequest, SongRequestListResponse, ApiResponse, Wedding } from '../types';
import { getAuthToken } from '../lib/auth';

interface MusicRequestsProps {
  weddingId: string;
  wedding: Wedding;
  onBack: () => void;
}

/**
 * Music requests management component.
 * PRD: "Admin can view song requests" and "Admin can export playlist for DJ"
 */
export function MusicRequests({ weddingId, wedding, onBack }: MusicRequestsProps) {
  const [songRequests, setSongRequests] = useState<SongRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const fetchSongRequests = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/music/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<SongRequestListResponse> = await response.json();

      if (data.ok) {
        setSongRequests(data.data.songRequests);
      } else {
        setError('Unable to load song requests');
      }
    } catch {
      setError('Unable to load song requests');
    } finally {
      setIsLoading(false);
    }
  }, [weddingId]);

  useEffect(() => {
    fetchSongRequests();
  }, [fetchSongRequests]);

  const handleDelete = async (requestId: string) => {
    if (!confirm('Are you sure you want to remove this song request?')) {
      return;
    }

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/music/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<void> = await response.json();

      if (data.ok) {
        setSongRequests((prev) => prev.filter((r) => r.id !== requestId));
      }
    } catch {
      // Ignore errors
    }
  };

  const handleExport = async (format: 'csv' | 'txt') => {
    setIsExporting(true);
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${weddingId}/music/export?format=${format}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const contentDisposition = response.headers.get('Content-Disposition');
        const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
        const filename = filenameMatch ? filenameMatch[1] : `song-requests.${format}`;

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch {
      // Ignore errors
    } finally {
      setIsExporting(false);
    }
  };

  // Feature not enabled
  if (!wedding.features.MUSIC_REQUESTS) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
        >
          <BackIcon className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-lg">
          <MusicNoteIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg text-neutral-800 mb-2">Music requests not enabled</h3>
          <p className="text-neutral-500">
            Enable the Music Requests feature in Site features to allow guests to suggest songs.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
        >
          <BackIcon className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading song requests...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
        >
          <BackIcon className="w-4 h-4" />
          Back to dashboard
        </button>
        <div className="text-center py-12 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              fetchSongRequests();
            }}
            className="mt-4 btn-secondary"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
      >
        <BackIcon className="w-4 h-4" />
        Back to dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl text-neutral-800 mb-1">Song Requests</h2>
          <p className="text-neutral-500">
            {songRequests.length} song{songRequests.length !== 1 ? 's' : ''} requested by guests
          </p>
        </div>
        {songRequests.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleExport('csv')}
              disabled={isExporting}
              className="btn-secondary text-sm"
            >
              <DownloadIcon className="w-4 h-4 mr-1" />
              Export CSV
            </button>
            <button
              onClick={() => handleExport('txt')}
              disabled={isExporting}
              className="btn-secondary text-sm"
            >
              <DownloadIcon className="w-4 h-4 mr-1" />
              Export Text
            </button>
          </div>
        )}
      </div>

      {songRequests.length === 0 ? (
        <div className="text-center py-12 bg-neutral-50 border border-neutral-200 rounded-lg">
          <MusicNoteIcon className="w-12 h-12 text-neutral-300 mx-auto mb-4" />
          <h3 className="text-lg text-neutral-800 mb-2">No song requests yet</h3>
          <p className="text-neutral-500">
            When guests suggest songs on your wedding site, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-100 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Song</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Artist</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Requested By</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-neutral-600">Date</th>
                <th className="px-4 py-3 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {songRequests.map((request) => (
                <tr key={request.id} className="hover:bg-neutral-100/50">
                  <td className="px-4 py-3 text-neutral-800">{request.songTitle}</td>
                  <td className="px-4 py-3 text-neutral-600">{request.artistName}</td>
                  <td className="px-4 py-3 text-neutral-600">
                    {request.requesterName || <span className="text-neutral-400">Anonymous</span>}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 text-sm">
                    {new Date(request.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(request.id)}
                      className="text-neutral-400 hover:text-red-600 p-1"
                      title="Remove song request"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </svg>
  );
}

function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
    </svg>
  );
}

export default MusicRequests;
