import { useState } from 'react';
import type { PlanTier, Plan, ApiResponse, CreateCheckoutSessionResponse } from '@wedding-bestie/shared';
import { getAuthToken } from '../lib/auth';

/**
 * Plan data with features for display
 */
const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    priceId: '',
    features: [
      'Beautiful wedding website',
      'RSVP tracking',
      'Guest list management',
      'Mobile-friendly design',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    priceId: '',
    features: [
      'Everything in Starter',
      'Photo gallery',
      'Custom domain',
      'Announcement banners',
      'Advanced customization',
    ],
  },
];

interface CreateWeddingProps {
  onCancel: () => void;
}

/**
 * Multi-step form for creating a new wedding.
 * Step 1: Enter wedding details
 * Step 2: Select plan
 * Step 3: Redirect to Stripe Checkout
 */
export function CreateWedding({ onCancel }: CreateWeddingProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [weddingName, setWeddingName] = useState('');
  const [partner1, setPartner1] = useState('');
  const [partner2, setPartner2] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<PlanTier | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canProceedToStep2 = weddingName.trim() && partner1.trim() && partner2.trim();

  const handleSubmit = async () => {
    if (!selectedPlan || !canProceedToStep2) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const token = getAuthToken();
      const response = await fetch('/api/billing/checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planId: selectedPlan,
          weddingName: weddingName.trim(),
          partnerNames: [partner1.trim(), partner2.trim()],
        }),
      });

      const data: ApiResponse<CreateCheckoutSessionResponse> = await response.json();

      if (data.ok) {
        // Redirect to Stripe Checkout
        window.location.href = data.data.checkoutUrl;
      } else {
        setError('We could not start checkout. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="flex items-center justify-center mb-8">
        <div className="flex items-center gap-3">
          <StepIndicator number={1} active={step === 1} completed={step > 1} />
          <div className="w-12 h-0.5 bg-neutral-200" />
          <StepIndicator number={2} active={step === 2} completed={false} />
        </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl text-neutral-800 mb-2">Tell us about your wedding</h2>
            <p className="text-neutral-500">We will use this to personalize your site</p>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="weddingName" className="block text-sm font-medium text-neutral-700 mb-1">
                Wedding name
              </label>
              <input
                id="weddingName"
                type="text"
                value={weddingName}
                onChange={(e) => setWeddingName(e.target.value)}
                placeholder="The Smith-Johnson Wedding"
                className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="partner1" className="block text-sm font-medium text-neutral-700 mb-1">
                  First partner
                </label>
                <input
                  id="partner1"
                  type="text"
                  value={partner1}
                  onChange={(e) => setPartner1(e.target.value)}
                  placeholder="Sarah"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label htmlFor="partner2" className="block text-sm font-medium text-neutral-700 mb-1">
                  Second partner
                </label>
                <input
                  id="partner2"
                  type="text"
                  value={partner2}
                  onChange={(e) => setPartner2(e.target.value)}
                  placeholder="Michael"
                  className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={!canProceedToStep2}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h2 className="text-2xl text-neutral-800 mb-2">Choose your plan</h2>
            <p className="text-neutral-500">Select the plan that works best for you</p>
          </div>

          <div className="grid gap-4">
            {PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selected={selectedPlan === plan.id}
                onSelect={() => setSelectedPlan(plan.id)}
              />
            ))}
          </div>

          {error && (
            <div className="p-4 bg-primary-50 border border-primary-200 rounded-lg text-primary-800 text-center">
              {error}
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedPlan || isSubmitting}
              className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Starting checkout...' : 'Continue to checkout'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface StepIndicatorProps {
  number: number;
  active: boolean;
  completed: boolean;
}

function StepIndicator({ number, active, completed }: StepIndicatorProps) {
  return (
    <div
      className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
        completed
          ? 'bg-accent-500 text-neutral-50'
          : active
            ? 'bg-primary-600 text-neutral-50'
            : 'bg-neutral-200 text-neutral-500'
      }`}
    >
      {completed ? (
        <CheckIcon className="w-4 h-4" />
      ) : (
        number
      )}
    </div>
  );
}

interface PlanCardProps {
  plan: Plan;
  selected: boolean;
  onSelect: () => void;
}

function PlanCard({ plan, selected, onSelect }: PlanCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-6 rounded-lg border-2 text-left transition-all ${
        selected
          ? 'border-primary-500 bg-primary-50'
          : 'border-neutral-200 hover:border-neutral-300'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-medium text-neutral-800">{plan.name}</h3>
        </div>
        <div
          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
            selected ? 'border-primary-500 bg-primary-500' : 'border-neutral-300'
          }`}
        >
          {selected && <div className="w-2 h-2 rounded-full bg-neutral-50" />}
        </div>
      </div>
      <ul className="space-y-2">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-center gap-2 text-neutral-600">
            <CheckIcon className="w-4 h-4 text-accent-500 flex-shrink-0" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </button>
  );
}

function CheckIcon({ className }: { className?: string }) {
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
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}
