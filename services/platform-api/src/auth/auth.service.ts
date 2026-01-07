import { Injectable } from '@nestjs/common';
import { randomBytes, createHash } from 'crypto';
import type {
  User,
  AuthSession,
  MagicLinkRequestResponse,
} from '../types';

interface StoredMagicLink {
  email: string;
  hashedToken: string;
  expiresAt: Date;
}

interface StoredSession {
  userId: string;
  hashedToken: string;
  expiresAt: Date;
}

/**
 * In-memory auth service for development.
 * In production, this would be backed by Postgres.
 */
@Injectable()
export class AuthService {
  // In-memory stores for dev mode
  private users: Map<string, User> = new Map();
  private magicLinks: Map<string, StoredMagicLink> = new Map();
  private sessions: Map<string, StoredSession> = new Map();

  private readonly MAGIC_LINK_EXPIRY_MINUTES = 15;
  private readonly SESSION_EXPIRY_DAYS = 7;

  /**
   * Hash a token for secure storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate a secure random token
   */
  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Find or create a user by email
   */
  private findOrCreateUser(email: string): User {
    // Check if user exists
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }

    // Create new user
    const user: User = {
      id: randomBytes(16).toString('hex'),
      email,
      createdAt: new Date().toISOString(),
    };
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Request a magic link for the given email.
   * In dev mode, logs the link to console.
   * In production, would send via SendGrid.
   */
  async requestMagicLink(email: string): Promise<MagicLinkRequestResponse> {
    const token = this.generateToken();
    const hashedToken = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.MAGIC_LINK_EXPIRY_MINUTES);

    // Store the magic link (keyed by hashed token for lookup)
    this.magicLinks.set(hashedToken, {
      email,
      hashedToken,
      expiresAt,
    });

    // In dev mode, log the magic link to console
    const magicLinkUrl = `http://localhost:3000/auth/verify?token=${token}`;
    console.log('\n========================================');
    console.log('🔐 MAGIC LINK (dev mode)');
    console.log(`   Email: ${email}`);
    console.log(`   Link: ${magicLinkUrl}`);
    console.log(`   Expires: ${expiresAt.toISOString()}`);
    console.log('========================================\n');

    return {
      message: 'If an account exists for this email, a magic link has been sent.',
    };
  }

  /**
   * Verify a magic link token and create a session.
   * Returns null if token is invalid or expired.
   */
  async verifyMagicLink(token: string): Promise<AuthSession | null> {
    const hashedToken = this.hashToken(token);
    const magicLink = this.magicLinks.get(hashedToken);

    if (!magicLink) {
      return null;
    }

    // Check expiry
    if (new Date() > magicLink.expiresAt) {
      this.magicLinks.delete(hashedToken);
      return null;
    }

    // Magic link is valid - consume it
    this.magicLinks.delete(hashedToken);

    // Find or create the user
    const user = this.findOrCreateUser(magicLink.email);

    // Create session
    const sessionToken = this.generateToken();
    const sessionHashedToken = this.hashToken(sessionToken);
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setDate(sessionExpiresAt.getDate() + this.SESSION_EXPIRY_DAYS);

    this.sessions.set(sessionHashedToken, {
      userId: user.id,
      hashedToken: sessionHashedToken,
      expiresAt: sessionExpiresAt,
    });

    return {
      user,
      token: sessionToken,
      expiresAt: sessionExpiresAt.toISOString(),
    };
  }

  /**
   * Validate a session token and return the user.
   * Returns null if session is invalid or expired.
   */
  async validateSession(token: string): Promise<User | null> {
    const hashedToken = this.hashToken(token);
    const session = this.sessions.get(hashedToken);

    if (!session) {
      return null;
    }

    // Check expiry
    if (new Date() > session.expiresAt) {
      this.sessions.delete(hashedToken);
      return null;
    }

    const user = this.users.get(session.userId);
    return user || null;
  }

  /**
   * Invalidate a session (logout)
   */
  async logout(token: string): Promise<void> {
    const hashedToken = this.hashToken(token);
    this.sessions.delete(hashedToken);
  }
}
