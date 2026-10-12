/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * ZK Proof Web Worker
 * Runs snarkjs.groth16.fullProve off the main UI thread.
 * Communicates via postMessage.
 */
import * as snarkjs from 'snarkjs'

interface WorkerInput {
  inputSignals: Record<string, string | number | bigint>
  wasmPath: string
  zkeyPath: string
}

self.addEventListener('message', async (event: MessageEvent<WorkerInput>) => {
  const { inputSignals, wasmPath, zkeyPath } = event.data

  try {
    // Stage 1: witness generation
    self.postMessage({ stage: 'witness' })

    const { proof, publicSignals } = await (snarkjs as any).groth16.fullProve(
      inputSignals,
      wasmPath,
      zkeyPath,
    )

    // Stage 2: done
    self.postMessage({ stage: 'done', proof, publicSignals })
  } catch (err: any) {
    self.postMessage({ stage: 'error', error: err?.message ?? 'Unknown ZK error' })
  }
})
