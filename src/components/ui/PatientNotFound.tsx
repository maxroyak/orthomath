import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function PatientNotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <svg className="w-12 h-12 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">Patient not found</h3>
      <p className="text-sm text-slate-500 max-w-md mb-6">
        The patient you are looking for does not exist or has been deleted.
      </p>
      <Button onClick={() => navigate('/dashboard')}>Back to Dashboard</Button>
    </div>
  );
}