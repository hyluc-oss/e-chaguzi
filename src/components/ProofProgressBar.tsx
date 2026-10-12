'use client'

interface Props {
  stage: 'idle' | 'witness' | 'proving' | 'done' | 'error'
  progress?: number
  errorMsg?: string
}

const STAGES = [
  { key: 'witness', label: 'Build Witness', icon: '🧮' },
  { key: 'proving', label: 'Compute Proof', icon: '🔐' },
  { key: 'done', label: 'Proof Ready', icon: '✅' },
]

export default function ProofProgressBar({ stage, progress = 0, errorMsg }: Props) {
  const pct =
    stage === 'done' ? 100 :
    stage === 'proving' ? 66 + progress * 0.33 :
    stage === 'witness' ? 33 :
    stage === 'error' ? 0 : 0

  const stageLabel =
    stage === 'idle' ? 'ZK Proof Generator Ready' :
    stage === 'witness' ? 'Building Witness…' :
    stage === 'proving' ? 'Computing Groth16 Proof…' :
    stage === 'done' ? 'Proof Generated!' :
    `Error: ${errorMsg ?? 'Unknown'}`

  return (
    <div className="glass-card p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {stage === 'error' ? (
            <div className="w-9 h-9 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-base">
              ❌
            </div>
          ) : (
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                stage !== 'idle' ? 'zk-pulse' : 'opacity-40'
              }`}
              style={{ background: '#2457C5' }}
            >
              🔐
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-white">{stageLabel}</div>
            <div className="text-xs text-gray-500">Groth16 / BN254</div>
          </div>
        </div>
        <span
          className="text-sm font-mono font-bold"
          style={{ color: stage === 'error' ? '#F87171' : '#2457C5' }}
        >
          {Math.round(pct)}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="progress-bar mb-5">
        <div
          className="progress-fill"
          style={{
            width: `${pct}%`,
            background: stage === 'error'
              ? 'linear-gradient(90deg, #EF4444, #F87171)'
              : undefined,
          }}
        />
      </div>

      {/* Stage indicators */}
      <div className="flex justify-between">
        {STAGES.map((s, i) => {
          const isActive = stage === s.key
          const isDone =
            (s.key === 'witness' && ['proving', 'done'].includes(stage)) ||
            (s.key === 'proving' && stage === 'done') ||
            (s.key === 'done' && stage === 'done')

          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all ${
                  isDone ? 'border-pulse' : isActive ? '' : 'opacity-30'
                }`}
                style={{
                  border: isActive
                    ? '2px solid #2457C5'
                    : isDone
                    ? '2px solid #1EB53A'
                    : '2px solid #374151',
                  background: isDone ? 'rgba(30,181,58,0.1)' : isActive ? 'rgba(0,163,221,0.1)' : 'transparent',
                }}
              >
                {s.icon}
              </div>
              <span
                className="text-xs text-center leading-tight"
                style={{
                  color: isActive ? '#00A3DD' : isDone ? '#1EB53A' : '#4B5563',
                }}
              >
                {s.label}
              </span>
            </div>
          )
        })}
      </div>

      {stage === 'idle' && (
        <p className="text-xs text-gray-600 text-center mt-4">
          Proof generation runs in a Web Worker — UI stays smooth during computation.
        </p>
      )}
    </div>
  )
}
