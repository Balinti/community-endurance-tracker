'use client';

import { useState } from 'react';
import { parseDuration } from '@/lib/utils';

interface EffortFormProps {
  onSubmit: (durationSeconds: number, avgHR?: number, notes?: string) => void;
  isSubmitting?: boolean;
}

export default function EffortForm({ onSubmit, isSubmitting = false }: EffortFormProps) {
  const [time, setTime] = useState('');
  const [hr, setHR] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const duration = parseDuration(time);
    if (!duration) {
      setError('Please enter time in mm:ss format (e.g., 20:00)');
      return;
    }

    if (duration < 600 || duration > 3600) {
      setError('Time should be between 10:00 and 60:00');
      return;
    }

    const avgHR = hr ? parseInt(hr, 10) : undefined;
    if (avgHR && (avgHR < 50 || avgHR > 250)) {
      setError('Heart rate should be between 50 and 250 bpm');
      return;
    }

    onSubmit(duration, avgHR, notes || undefined);
    setTime('');
    setHR('');
    setNotes('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="time"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          20-Minute Effort Time *
        </label>
        <input
          type="text"
          id="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          placeholder="e.g., 20:30"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
          required
        />
        <p className="mt-1 text-xs text-gray-500">
          Enter your time in mm:ss format
        </p>
      </div>

      <div>
        <label
          htmlFor="hr"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Average Heart Rate (optional)
        </label>
        <input
          type="number"
          id="hr"
          value={hr}
          onChange={(e) => setHR(e.target.value)}
          placeholder="e.g., 165"
          min="50"
          max="250"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
        />
        <p className="mt-1 text-xs text-gray-500">
          Helps with verification (increases confidence score)
        </p>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes (optional)
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Felt strong today, good pacing"
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors resize-none"
        />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-lg hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg"
      >
        {isSubmitting ? 'Submitting...' : 'Log Effort'}
      </button>
    </form>
  );
}
