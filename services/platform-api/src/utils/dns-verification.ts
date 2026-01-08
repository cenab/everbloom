import * as dns from 'dns';
import { promisify } from 'util';

const resolveCname = promisify(dns.resolveCname);
const resolveTxt = promisify(dns.resolveTxt);

export interface DnsVerificationResult {
  cnameVerified: boolean;
  txtVerified: boolean;
  cnameValue?: string;
  txtValue?: string;
  cnameError?: string;
  txtError?: string;
}

/**
 * Target CNAME value that domains should point to
 */
const CNAME_TARGET = process.env.NETLIFY_SITE_DOMAIN || 'wedding-bestie.netlify.app';

/**
 * Verify DNS records for a custom domain
 * Checks CNAME and TXT records
 */
export async function verifyDnsRecords(
  domain: string,
  expectedTxtValue: string,
): Promise<DnsVerificationResult> {
  const result: DnsVerificationResult = {
    cnameVerified: false,
    txtVerified: false,
  };

  // Verify CNAME record
  try {
    const cnameRecords = await resolveCname(domain);
    if (cnameRecords && cnameRecords.length > 0) {
      result.cnameValue = cnameRecords[0];
      // Check if CNAME points to our Netlify site
      result.cnameVerified = cnameRecords.some(
        (cname) => cname.toLowerCase().includes(CNAME_TARGET.toLowerCase()) ||
                   cname.toLowerCase().includes('netlify') ||
                   cname.toLowerCase().endsWith('.netlify.app')
      );
    }
  } catch (error: unknown) {
    const dnsError = error as NodeJS.ErrnoException;
    if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
      result.cnameError = 'CNAME record not found';
    } else {
      result.cnameError = `DNS lookup failed: ${dnsError.message}`;
    }
  }

  // Verify TXT record for domain ownership
  const txtDomain = `_everbloom.${domain}`;
  try {
    const txtRecords = await resolveTxt(txtDomain);
    if (txtRecords && txtRecords.length > 0) {
      // TXT records can be split into multiple strings, join them
      const flatRecords = txtRecords.map((r) => r.join(''));
      result.txtValue = flatRecords.join(', ');
      // Check if any TXT record matches our expected value
      result.txtVerified = flatRecords.some(
        (txt) => txt === expectedTxtValue || txt.includes(expectedTxtValue)
      );
    }
  } catch (error: unknown) {
    const dnsError = error as NodeJS.ErrnoException;
    if (dnsError.code === 'ENODATA' || dnsError.code === 'ENOTFOUND') {
      result.txtError = 'TXT record not found';
    } else {
      result.txtError = `DNS lookup failed: ${dnsError.message}`;
    }
  }

  return result;
}

/**
 * Generate a unique verification token for a domain
 */
export function generateVerificationToken(weddingId: string, domain: string): string {
  const crypto = require('crypto');
  const data = `${weddingId}:${domain}:${process.env.DOMAIN_VERIFICATION_SECRET || 'everbloom-secret'}`;
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 32);
}

/**
 * Check if an A record points to Netlify's load balancer
 */
export async function verifyARecord(domain: string): Promise<{
  verified: boolean;
  value?: string;
  error?: string;
}> {
  const resolveA = promisify(dns.resolve4);

  // Netlify's load balancer IP
  const NETLIFY_LB_IP = '75.2.60.5';

  try {
    const aRecords = await resolveA(domain);
    if (aRecords && aRecords.length > 0) {
      return {
        verified: aRecords.includes(NETLIFY_LB_IP),
        value: aRecords.join(', '),
      };
    }
    return { verified: false, error: 'A record not found' };
  } catch (error: unknown) {
    const dnsError = error as NodeJS.ErrnoException;
    return {
      verified: false,
      error: dnsError.code === 'ENOTFOUND' ? 'Domain not found' : dnsError.message,
    };
  }
}
