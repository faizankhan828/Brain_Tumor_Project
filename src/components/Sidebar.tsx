import { Activity, BrainCircuit, History, ScanSearch, ShieldCheck } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navigation = [
  { to: '/upload',  label: 'Upload & Analyse', icon: ScanSearch, desc: 'Run MRI prediction' },
  { to: '/history', label: 'Scan History',     icon: History,    desc: 'View past results' },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-30 bg-slate-950/70 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/[0.07]
                    bg-[#06101c]/95 backdrop-blur-2xl transition-transform duration-300 lg:translate-x-0 ${
                      open ? 'translate-x-0' : '-translate-x-full'
                    }`}
      >
        {/* Top accent line */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-400/50 to-transparent" />

        {/* ── Brand block ─────────────────────────────────────── */}
        <div className="p-5">
          <div className="medical-gradient rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-400/15
                              border border-teal-400/25 text-teal-300 shadow-[0_0_16px_rgba(20,184,166,0.2)]">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <p className="section-label mb-0.5">Medical AI</p>
                <p className="text-sm font-bold text-white leading-tight">Brain Tumor MRI</p>
                <p className="text-xs text-slate-400">Detector v1.0</p>
              </div>
            </div>

            {/* Status row */}
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.04] px-3 py-2">
              <span className="live-dot" />
              <span className="text-xs text-slate-400">
                ResNet50 + Grad-CAM — <span className="text-emerald-300 font-medium">Active</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <nav className="flex-1 space-y-1 px-4">
          <p className="section-label mb-3 px-2">Navigation</p>

          {navigation.map((item) => {
            const Icon  = item.icon
            const active = location.pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
                  active
                    ? 'bg-teal-400/15 border border-teal-400/25 text-white shadow-[0_0_12px_rgba(20,184,166,0.15)]'
                    : 'border border-transparent text-slate-400 hover:border-white/[0.07] hover:bg-white/[0.05] hover:text-white'
                }`}
              >
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  active ? 'bg-teal-400/20 text-teal-300' : 'bg-white/[0.05] text-slate-500 group-hover:text-slate-300'
                }`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold leading-none">{item.label}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.desc}</p>
                </div>
                {active && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-teal-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* ── Feature tags ─────────────────────────────────────── */}
        <div className="p-4 space-y-2">
          <p className="section-label px-2 mb-3">Capabilities</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { icon: Activity,     text: '4-Class AI'     },
              { icon: ShieldCheck,  text: 'JWT Secure'     },
              { icon: BrainCircuit, text: 'Grad-CAM'       },
              { icon: ScanSearch,   text: 'PDF Reports'    },
            ].map(({ icon: Icon, text }) => (
              <div key={text}
                   className="flex items-center gap-2 rounded-xl border border-white/[0.06]
                              bg-white/[0.03] px-2.5 py-2 text-xs text-slate-400">
                <Icon className="h-3.5 w-3.5 text-teal-400/70 shrink-0" />
                {text}
              </div>
            ))}
          </div>

          <p className="mt-3 rounded-xl border border-amber-400/15 bg-amber-400/[0.07] px-3 py-2.5
                        text-[11px] leading-5 text-amber-200/70 text-center">
            For clinical support only — not a substitute for medical diagnosis.
          </p>
        </div>
      </aside>
    </>
  )
}
