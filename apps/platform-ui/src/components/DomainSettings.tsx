import { useState, useEffect, useCallback } from 'react';
import { getAuthToken } from '../lib/auth';
import type {
  ApiResponse,
  Wedding,
  GetCustomDomainResponse,
  AddCustomDomainResponse,
  VerifyCustomDomainResponse,
  RemoveCustomDomainResponse,
  CustomDomainConfig,
} from '../types';

interface DomainSettingsProps {
  wedding: Wedding;
  onDomainChanged?: () => void;
}

/**
 * Custom domain settings for a wedding site.
 * PRD: "Admin can connect custom domain"
 * PRD: "SSL certificate is provisioned for custom domain"
 * PRD: "Site works on both default and custom domain"
 */
export function DomainSettings({
  wedding,
  onDomainChanged,
}: DomainSettingsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [customDomain, setCustomDomain] = useState<CustomDomainConfig | null>(null);
  const [defaultDomainUrl, setDefaultDomainUrl] = useState('');
  const [customDomainUrl, setCustomDomainUrl] = useState<string | undefined>();

  const [newDomain, setNewDomain] = useState('');
  const [instructions, setInstructions] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [verificationMessage, setVerificationMessage] = useState<string | null>(null);

  const fetchDomainConfig = useCallback(async () => {
    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/custom-domain`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<GetCustomDomainResponse> = await response.json();

      if (data.ok) {
        setCustomDomain(data.data.customDomain);
        setDefaultDomainUrl(data.data.defaultDomainUrl);
        setCustomDomainUrl(data.data.customDomainUrl);
      }
    } catch {
      // Handle fetch error silently
    } finally {
      setIsLoading(false);
    }
  }, [wedding.id]);

  useEffect(() => {
    fetchDomainConfig();
  }, [fetchDomainConfig]);

  const handleAddDomain = async () => {
    if (!newDomain.trim()) {
      setError('Please enter a domain name.');
      return;
    }

    setIsAdding(true);
    setError(null);
    setSuccessMessage(null);
    setInstructions(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/custom-domain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });

      const data: ApiResponse<AddCustomDomainResponse> = await response.json();

      if (data.ok) {
        setCustomDomain(data.data.customDomain);
        setInstructions(data.data.instructions);
        setNewDomain('');
        setSuccessMessage('Domain added! Configure the DNS records below.');
        onDomainChanged?.();
      } else {
        const errorCode = (data as { error?: string }).error;
        if (errorCode === 'INVALID_DOMAIN_FORMAT') {
          setError('Please enter a valid domain (e.g., wedding.example.com).');
        } else if (errorCode === 'CUSTOM_DOMAIN_ALREADY_EXISTS') {
          setError('This domain is already connected to another wedding.');
        } else {
          setError('Unable to add domain. Please try again.');
        }
      }
    } catch {
      setError('Unable to add domain. Please try again.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleVerifyDomain = async () => {
    setIsVerifying(true);
    setError(null);
    setVerificationMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/custom-domain/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<VerifyCustomDomainResponse> = await response.json();

      if (data.ok) {
        setCustomDomain(data.data.customDomain);
        setVerificationMessage(data.data.message);

        if (data.data.customDomain.status === 'active') {
          setSuccessMessage('Your domain is active! SSL certificate has been provisioned.');
          setCustomDomainUrl(`https://${data.data.customDomain.domain}`);
          onDomainChanged?.();
        }
      } else {
        setError('Unable to verify domain. Please try again.');
      }
    } catch {
      setError('Unable to verify domain. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRemoveDomain = async () => {
    if (!window.confirm('Are you sure you want to disconnect this domain? Your site will still be accessible at the default URL.')) {
      return;
    }

    setIsRemoving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const token = getAuthToken();
      const response = await fetch(`/api/weddings/${wedding.id}/custom-domain`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<RemoveCustomDomainResponse> = await response.json();

      if (data.ok) {
        setCustomDomain(null);
        setCustomDomainUrl(undefined);
        setInstructions(null);
        setVerificationMessage(null);
        setSuccessMessage(data.data.message);
        onDomainChanged?.();
      } else {
        setError('Unable to remove domain. Please try again.');
      }
    } catch {
      setError('Unable to remove domain. Please try again.');
    } finally {
      setIsRemoving(false);
    }
  };

  const getStatusBadge = (status: CustomDomainConfig['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Pending DNS
          </span>
        );
      case 'verifying':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Verifying
          </span>
        );
      case 'ssl_pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            SSL Pending
          </span>
        );
      case 'active':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-3 h-3 mr-1" />
            Active
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Failed
          </span>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl text-neutral-800">Custom domain</h1>
        <p className="text-neutral-500 mt-1">
          Connect your own domain to make your wedding site more personal.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Default Domain Display */}
      <div className="mb-6 p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-neutral-800">Default URL</h3>
            <p className="text-sm text-neutral-600 mt-0.5 font-mono">{defaultDomainUrl}</p>
          </div>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-200 text-neutral-700">
            Always available
          </span>
        </div>
      </div>

      {/* Custom Domain Section */}
      {customDomain ? (
        <div className="space-y-6">
          {/* Current Domain */}
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-medium text-neutral-800">Custom domain</h3>
                <p className="text-sm text-neutral-600 mt-0.5 font-mono">{customDomain.domain}</p>
              </div>
              {getStatusBadge(customDomain.status)}
            </div>

            {customDomainUrl && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-700">
                  Your site is live at:{' '}
                  <a
                    href={customDomainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium underline"
                  >
                    {customDomainUrl}
                  </a>
                </p>
              </div>
            )}

            {/* DNS Records Table */}
            {customDomain.status !== 'active' && (
              <div className="mb-4">
                <h4 className="text-sm font-medium text-neutral-700 mb-2">DNS Records</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200">
                        <th className="text-left py-2 pr-4 font-medium text-neutral-600">Type</th>
                        <th className="text-left py-2 pr-4 font-medium text-neutral-600">Name</th>
                        <th className="text-left py-2 pr-4 font-medium text-neutral-600">Value</th>
                        <th className="text-left py-2 font-medium text-neutral-600">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customDomain.dnsRecords.map((record, index) => (
                        <tr key={index} className="border-b border-neutral-100 last:border-0">
                          <td className="py-2 pr-4 font-mono text-neutral-800">{record.type}</td>
                          <td className="py-2 pr-4 font-mono text-neutral-700 break-all">{record.name}</td>
                          <td className="py-2 pr-4 font-mono text-neutral-700 break-all">{record.value}</td>
                          <td className="py-2">
                            {record.verified ? (
                              <span className="text-green-600 flex items-center gap-1">
                                <CheckCircleIcon className="w-4 h-4" />
                                Verified
                              </span>
                            ) : (
                              <span className="text-amber-600 flex items-center gap-1">
                                <ClockIcon className="w-4 h-4" />
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {verificationMessage && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                {verificationMessage}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              {customDomain.status !== 'active' && (
                <button
                  onClick={handleVerifyDomain}
                  disabled={isVerifying}
                  className="btn-primary disabled:opacity-50"
                >
                  {isVerifying ? 'Verifying...' : 'Verify domain'}
                </button>
              )}
              <button
                onClick={handleRemoveDomain}
                disabled={isRemoving}
                className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
              >
                {isRemoving ? 'Removing...' : 'Disconnect domain'}
              </button>
            </div>
          </div>

          {/* Instructions */}
          {instructions && customDomain.status === 'pending' && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex gap-3">
                <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-2">DNS Configuration Instructions</p>
                  <pre className="whitespace-pre-wrap text-blue-700 font-mono text-xs bg-blue-100 p-3 rounded">
                    {instructions}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Add New Domain Form */
        <div className="space-y-6">
          <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-lg">
            <h3 className="font-medium text-neutral-800 mb-3">Add a custom domain</h3>
            <div className="flex gap-3">
              <input
                type="text"
                value={newDomain}
                onChange={(e) => {
                  setNewDomain(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., wedding.example.com"
                className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              <button
                onClick={handleAddDomain}
                disabled={isAdding || !newDomain.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {isAdding ? 'Adding...' : 'Add domain'}
              </button>
            </div>
            <p className="text-xs text-neutral-500 mt-2">
              Enter your domain without http:// or https://
            </p>
          </div>

          {/* Info box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex gap-3">
              <InfoIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">How it works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700">
                  <li>Enter your custom domain and we&apos;ll provide DNS configuration instructions</li>
                  <li>Update your DNS records with your domain registrar</li>
                  <li>DNS changes can take up to 48 hours to propagate</li>
                  <li>Once verified, we&apos;ll automatically provision an SSL certificate</li>
                  <li>Your site will be accessible on both the default and custom URLs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

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

function ClockIcon({ className }: { className?: string }) {
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
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
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
        d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
      />
    </svg>
  );
}
