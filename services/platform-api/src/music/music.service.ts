import { Injectable, Logger } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { SongRequest, ExportPlaylistResponse } from '../types';

/**
 * Service for managing guest song requests for weddings.
 * Allows guests to suggest songs for the DJ playlist.
 */
@Injectable()
export class MusicService {
  private readonly logger = new Logger(MusicService.name);

  // In-memory storage for development (replace with database in production)
  private songRequests = new Map<string, SongRequest>();

  /**
   * Submit a new song request for a wedding.
   */
  submitSongRequest(
    weddingId: string,
    songTitle: string,
    artistName: string,
    requesterName?: string,
  ): SongRequest {
    const id = randomBytes(16).toString('hex');
    const now = new Date().toISOString();

    const songRequest: SongRequest = {
      id,
      weddingId,
      songTitle: songTitle.trim(),
      artistName: artistName.trim(),
      requesterName: requesterName?.trim(),
      createdAt: now,
    };

    this.songRequests.set(id, songRequest);
    this.logger.log(`Song request submitted: "${songTitle}" by ${artistName} for wedding ${weddingId}`);

    return songRequest;
  }

  /**
   * Get all song requests for a wedding.
   */
  getSongRequestsForWedding(weddingId: string): SongRequest[] {
    const requests: SongRequest[] = [];
    for (const request of this.songRequests.values()) {
      if (request.weddingId === weddingId) {
        requests.push(request);
      }
    }
    // Sort by creation date (newest first)
    return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get song request count for a wedding.
   */
  getSongRequestCount(weddingId: string): number {
    let count = 0;
    for (const request of this.songRequests.values()) {
      if (request.weddingId === weddingId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Delete a song request.
   */
  deleteSongRequest(id: string): boolean {
    if (this.songRequests.has(id)) {
      this.songRequests.delete(id);
      this.logger.log(`Song request deleted: ${id}`);
      return true;
    }
    return false;
  }

  /**
   * Get a single song request by ID.
   */
  getSongRequest(id: string): SongRequest | undefined {
    return this.songRequests.get(id);
  }

  /**
   * Export song requests as CSV for DJ.
   */
  exportPlaylistAsCsv(weddingId: string): ExportPlaylistResponse {
    const requests = this.getSongRequestsForWedding(weddingId);

    // Build CSV content
    const header = 'Song Title,Artist,Requested By,Date Requested';
    const rows = requests.map((r) => {
      const escapeCsv = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      const date = new Date(r.createdAt).toLocaleDateString();
      return [
        escapeCsv(r.songTitle),
        escapeCsv(r.artistName),
        escapeCsv(r.requesterName || 'Anonymous'),
        date,
      ].join(',');
    });

    const content = [header, ...rows].join('\n');

    return {
      content,
      filename: `song-requests-${weddingId}.csv`,
      contentType: 'text/csv',
    };
  }

  /**
   * Export song requests as plain text for DJ.
   */
  exportPlaylistAsText(weddingId: string): ExportPlaylistResponse {
    const requests = this.getSongRequestsForWedding(weddingId);

    const lines = requests.map((r, i) => {
      const requester = r.requesterName ? ` (requested by ${r.requesterName})` : '';
      return `${i + 1}. ${r.songTitle} - ${r.artistName}${requester}`;
    });

    const content = lines.join('\n');

    return {
      content,
      filename: `song-requests-${weddingId}.txt`,
      contentType: 'text/plain',
    };
  }
}
