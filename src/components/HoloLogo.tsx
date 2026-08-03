import { useEffect, useRef } from "react"
import { HoloRenderer } from "@/lib/three-renderer"
import { defaultSettings, type StickerSettings } from "@/lib/settings"

const logoSettings: StickerSettings = {
  ...defaultSettings,
  size: 3.6,
  border: 0.02,
  peelAmount: 0,
  shadow: 0,
  background: "transparent",
}

/** Live holofoil render of the wordmark, tilting toward the pointer. */
export function HoloLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<HoloRenderer | null>(null)
  const aspectRef = useRef(1)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const renderer = new HoloRenderer(canvas)
    rendererRef.current = renderer
    let cancelled = false
    void (async () => {
      const blob = await (await fetch("/logo-raw.png")).blob()
      const bitmap = await createImageBitmap(blob)
      if (cancelled) return
      aspectRef.current = bitmap.width / bitmap.height
      renderer.setImage(bitmap)
    })()

    let raf = 0
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
      renderer.render({ settings: logoSettings, imgAspect: aspectRef.current })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-label="Holosticker by JALCO"
      role="img"
      className="h-14 w-full touch-none"
      onPointerMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        rendererRef.current?.setTilt(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((e.clientY - rect.top) / rect.height) * 2,
        )
      }}
      onPointerLeave={() => rendererRef.current?.setTilt(0, 0)}
    />
  )
}
