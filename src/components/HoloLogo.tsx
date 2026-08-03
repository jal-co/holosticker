import { useEffect, useRef } from "react"
import { HoloRenderer } from "@/lib/three-renderer"
import { defaultSettings, type StickerSettings } from "@/lib/settings"

const logoSettings: StickerSettings = {
  ...defaultSettings,
  size: 3.0,
  border: 0.02,
  peelAmount: 0.26,
  peelDirection: "top-right",
  curl: 0.07,
  shadow: 0,
  background: "transparent",
}

/** Live holofoil render of the wordmark, tilting toward the pointer. */
export function HoloLogo({ follow = true }: { follow?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<HoloRenderer | null>(null)
  const aspectRef = useRef(1)
  const followRef = useRef(follow)

  useEffect(() => {
    followRef.current = follow
    if (!follow) rendererRef.current?.setTilt(0, 0)
  }, [follow])

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

    // follow the cursor anywhere on the page
    const onMove = (e: PointerEvent) => {
      if (!followRef.current) return
      const rect = canvas.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      renderer.setTilt(
        Math.max(-1, Math.min(1, (e.clientX - cx) / 500)),
        Math.max(-1, Math.min(1, (cy - e.clientY) / 500)),
      )
    }
    window.addEventListener("pointermove", onMove)
    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      window.removeEventListener("pointermove", onMove)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-label="Holosticker by JALCO"
      role="img"
      className="h-20 w-full touch-none"
    />
  )
}
