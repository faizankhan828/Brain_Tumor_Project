import { FileUp, History, ScanSearch } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const navigation = [
  { to: '/upload', label: 'Upload Scan', icon: ScanSearch },
  { to: '/history', label: 'Scan History', icon: History },
]

export function Sidebar({ open, onClose }: SidebarProps) {
  const location = useLocation()

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-slate-950/70 transition-opacity duration-300 lg:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`fixed left-0 top-0 z-40 flex h-full w-72 flex-col border-r border-white/10 bg-slate-950/90 p-5 backdrop-blur-xl transition-transform duration-300 lg:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo card */}
        <div className="shell-panel medical-gradient mb-6 p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950/70 text-teal-300">
              <FileUp className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-teal-100/80">Medical AI</p>
              <p className="text-lg font-semibold text-white">Brain Tumor MRI</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-slate-200/80">
            Upload MRI scans, get AI predictions with Grad-CAM visual explanations, and review your full scan history.
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = location.pathname === item.to

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                  active
                    ? 'bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20'
                    : 'text-slate-200 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Info card at bottom */}
        <div className="mt-auto rounded-3xl border border-teal-400/20 bg-teal-400/10 p-4 text-sm text-teal-50">
          <p className="font-semibold">ResNet50 + Grad-CAM</p>
          <p className="mt-2 leading-6 text-teal-50/80">
            Predictions use a trained ResNet50 model. Grad-CAM highlights the regions influencing each result.
          </p>
        </div>
      </aside>
    </>
  )
}
