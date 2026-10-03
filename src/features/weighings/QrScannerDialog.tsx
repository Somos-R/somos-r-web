import { useEffect, useRef, useState } from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '../../components/ui'
import { t } from '../../lib/i18n'

const copy = t.pesajes.drawer.person.qr

// How often a camera frame is looked at, and how long the same rejected QR is ignored (a person holds it
// in front of the camera for a while: announcing it on every frame would only flicker).
const SCAN_INTERVAL_MS = 150
const REPEAT_BLOCK_MS = 2000

type Problem = 'unsupported' | 'denied' | 'noCamera' | 'failed'

const hasCamera = () => typeof navigator.mediaDevices?.getUserMedia === 'function'

function problemOf(error: unknown): Problem {
  const name = (error as { name?: string } | null)?.name
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError' || name === 'OverconstrainedError') return 'noCamera'
  return 'failed'
}

interface ScannerViewProps {
  /** Receives the text of a QR; returns null to accept it, or the message to show when it is not valid. */
  onDetect: (text: string) => string | null
}

/** Mounted only while the dialog is open, so leaving always releases the camera. */
function ScannerView({ onDetect }: ScannerViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // The scan loop outlives renders: it reads the latest callback from here instead of restarting the camera.
  const onDetectRef = useRef(onDetect)
  useEffect(() => {
    onDetectRef.current = onDetect
  })
  const [ready, setReady] = useState(false)
  // Typical when the page is not served over https: browsers only give the camera to secure pages.
  const [problem, setProblem] = useState<Problem | null>(() => (hasCamera() ? null : 'unsupported'))
  const [rejection, setRejection] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false
    let stream: MediaStream | null = null
    let timer: number | undefined
    const video = videoRef.current

    if (!hasCamera()) return // already reported as `unsupported`

    const start = async () => {
      try {
        // The decoder is its own chunk: it is only downloaded when someone really scans.
        const [{ default: decode }, media] = await Promise.all([
          import('jsqr'),
          navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }),
        ])
        if (stopped) {
          media.getTracks().forEach((track) => track.stop())
          return
        }
        stream = media
        if (!video) return
        video.srcObject = media
        await video.play()
        setReady(true)

        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d', { willReadFrequently: true })
        if (!context) throw new Error('no canvas')
        let last = { text: '', at: 0 }

        timer = window.setInterval(() => {
          if (video.readyState < 2 || !video.videoWidth) return
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
          context.drawImage(video, 0, 0)
          const frame = context.getImageData(0, 0, canvas.width, canvas.height)
          const code = decode(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })
          if (!code?.data) return
          const now = Date.now()
          if (code.data === last.text && now - last.at < REPEAT_BLOCK_MS) return
          last = { text: code.data, at: now }
          setRejection(onDetectRef.current(code.data))
        }, SCAN_INTERVAL_MS)
      } catch (error) {
        if (!stopped) setProblem(problemOf(error))
      }
    }
    void start()

    return () => {
      stopped = true
      window.clearInterval(timer)
      stream?.getTracks().forEach((track) => track.stop())
      if (video) video.srcObject = null
    }
  }, [])

  if (problem) return <Alert severity="error">{copy[problem]}</Alert>

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="body2" color="text.secondary">{ready ? copy.hint : copy.starting}</Typography>
      <Box
        component="video"
        ref={videoRef}
        aria-label={copy.cameraLabel}
        muted
        playsInline
        sx={{ width: '100%', maxHeight: 320, objectFit: 'cover', borderRadius: 1, backgroundColor: '#000' }}
      />
      {rejection && <Alert severity="warning">{rejection}</Alert>}
    </Box>
  )
}

interface QrScannerDialogProps {
  open: boolean
  onClose: () => void
  onDetect: (text: string) => string | null
}

/** Reads a QR with the device camera, locally: nothing is recorded or sent; only the text of the QR goes up. */
export default function QrScannerDialog({ open, onClose, onDetect }: QrScannerDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs">
      <DialogTitle showClose onClose={onClose}>{copy.title}</DialogTitle>
      <DialogContent>
        <ScannerView onDetect={onDetect} />
      </DialogContent>
      <DialogActions>
        <Button variant="outlined" onClick={onClose}>{copy.close}</Button>
      </DialogActions>
    </Dialog>
  )
}
