/**
 * zkWorkerClient.ts
 *
 * Typed wrapper around the ZK proof Web Worker.
 * Spawns the worker, submits inputs, and returns a Promise.
 */

export interface ProofResult {
  proof: {
    pi_a: string[]
    pi_b: string[][]
    pi_c: string[]
    protocol: string
    curve: string
  }
  publicSignals: string[]
}

export interface WorkerMessage {
  stage: 'witness' | 'done' | 'error'
  proof?: ProofResult['proof']
  publicSignals?: string[]
  error?: string
}

type StageCallback = (stage: 'witness' | 'proving') => void

export async function generateZKProof(
  inputSignals: Record<string, string | number | bigint>,
  wasmPath: string = '/circuits/vote.wasm',
  zkeyPath: string = '/circuits/vote_final.zkey',
  onStage?: StageCallback,
): Promise<ProofResult> {
  return new Promise((resolve, reject) => {
    // Use inline worker from blob so Next.js doesn't need worker-loader
    const workerCode = `
      importScripts('https://cdn.jsdelivr.net/npm/snarkjs@0.7.4/build/snarkjs.min.js');
      self.addEventListener('message', async (event) => {
        const { inputSignals, wasmPath, zkeyPath } = event.data;
        try {
          self.postMessage({ stage: 'witness' });
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(inputSignals, wasmPath, zkeyPath);
          self.postMessage({ stage: 'done', proof, publicSignals });
        } catch (err) {
          self.postMessage({ stage: 'error', error: err?.message ?? 'ZK error' });
        }
      });
    `

    const blob = new Blob([workerCode], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl)

    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data
      if (msg.stage === 'witness') {
        onStage?.('witness')
      } else if (msg.stage === 'done') {
        URL.revokeObjectURL(workerUrl)
        worker.terminate()
        resolve({ proof: msg.proof!, publicSignals: msg.publicSignals! })
      } else if (msg.stage === 'error') {
        URL.revokeObjectURL(workerUrl)
        worker.terminate()
        reject(new Error(msg.error))
      }
    }

    worker.onerror = (err) => {
      URL.revokeObjectURL(workerUrl)
      worker.terminate()
      reject(new Error(err.message))
    }

    worker.postMessage({ inputSignals, wasmPath, zkeyPath })
    onStage?.('proving')
  })
}
