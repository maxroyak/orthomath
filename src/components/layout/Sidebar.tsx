import { NavLink, useLocation } from 'react-router-dom';
import type { Patient } from '../../domain/types';
import { store } from '../../persistence/store';
import { useEffect, useState, useMemo } from 'react';

export function Sidebar() {
  const location = useLocation();
  // Extract patientId from URL since useParams() doesn't work outside <Routes>
  const patientId = useMemo(() => {
    const match = location.pathname.match(/^\/patient\/([^/]+)/);
    return match ? match[1] : undefined;
  }, [location.pathname]);

  const [patient, setPatient] = useState<Patient | undefined>();

  useEffect(() => {
    if (patientId) {
      setPatient(store.getPatient(patientId));
    } else {
      setPatient(undefined);
    }
  }, [patientId]);

  const baseClass = 'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors';
  const activeClass = 'bg-primary-600 text-white';
  const inactiveClass = 'text-slate-600 hover:bg-slate-100';

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen sticky top-0 no-print">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-slate-200">
        <NavLink to="/" className="block">
          <div className="text-xl font-bold text-slate-900 tracking-tight">OrthoMath</div>
          <div className="text-xs text-slate-400 mt-0.5">Orthodontic Treatment Sandbox</div>
        </NavLink>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <NavLink to="/" end className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          Dashboard
        </NavLink>

        {patient && (
          <>
            <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Patient
            </div>
            <NavLink to={`/patient/${patientId}/diagnostics`} className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              Diagnostics
            </NavLink>
            <NavLink to={`/patient/${patientId}/scenarios`} className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
              Treatment Planning
            </NavLink>
            <NavLink to={`/patient/${patientId}/comparison`} className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-8 5h8M4 7h0M4 12h0M4 17h0" /></svg>
              Comparison
            </NavLink>
            <NavLink to={`/patient/${patientId}/summary`} className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Summary
            </NavLink>
          </>
        )}

        <div className="pt-4 pb-2 px-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          System
        </div>
        <NavLink to="/settings" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Settings
        </NavLink>
        <NavLink to="/about" className={({isActive}) => `${baseClass} ${isActive ? activeClass : inactiveClass}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          About
        </NavLink>
      </nav>

      {/* Footer disclaimer */}
      <div className="border-t border-slate-200 px-4 py-3">
        <p className="text-xs text-slate-400 leading-relaxed">
          Clinical calculation support tool. Does not diagnose or prescribe treatment.
        </p>
      </div>
    </aside>
  );
}