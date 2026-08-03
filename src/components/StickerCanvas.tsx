import { useEffect, useRef } from "react"
import { HoloRenderer } from "@/lib/three-renderer"
import type { StickerSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

interface Props {
  image: ImageBitmap | null
  imgAspect: number
  settings: StickerSettings
  onRendererReady: (r: HoloRenderer) => void
}

const bgClass: Record<StickerSettings["background"], string> = {
  transparent:
    "bg-[length:24px_24px] bg-[image:repeating-conic-gradient(oklch(0.94_0_0)_0%_25%,white_0%_50%)] dark:bg-[image:repeating-conic-gradient(oklch(0.24_0_0)_0%_25%,oklch(0.2_0_0)_0%_50%)]",
  white: "bg-white",
  black: "bg-black",
}

export function StickerCanvas({
  image,
  imgAspect,
  settings,
  onRendererReady,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<HoloRenderer | null>(null)

  // init renderer once
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || rendererRef.current) return
    const renderer = new HoloRenderer(canvas)
    rendererRef.current = renderer
    onRendererReady(renderer)
  }, [onRendererReady])

  // upload texture when image changes
  useEffect(() => {
    rendererRef.current?.setImage(image)
  }, [image])

  // continuous render loop so tilt-driven reflections stay live
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return
    let raf = 0
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.round(canvas.clientWidth * dpr)
      const h = Math.round(canvas.clientHeight * dpr)
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
      renderer.render({ settings, imgAspect })
      raf = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [settings, imgAspect, image])

  return (
    <div
      className={cn(
        "relative size-full overflow-hidden",
        bgClass[settings.background],
      )}
    >
      <canvas
        ref={canvasRef}
        className="size-full touch-none"
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          rendererRef.current?.setTilt(
            ((e.clientX - rect.left) / rect.width) * 2 - 1,
            1 - ((e.clientY - rect.top) / rect.height) * 2,
          )
        }}
        onPointerLeave={() => rendererRef.current?.setTilt(0, 0)}
      />
      {!image && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <p className="text-sm font-medium">No artwork yet</p>
          <p className="text-xs">Upload an SVG or PNG from the sidebar</p>
        </div>
      )}
    </div>
  )
}
