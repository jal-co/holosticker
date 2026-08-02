import { useEffect, useRef } from "react"
import { HoloRenderer } from "@/lib/renderer"
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

  // render on any change + keep canvas sized to its box
  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = rendererRef.current
    if (!canvas || !renderer) return
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = Math.round(canvas.clientWidth * dpr)
      if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
        canvas.width = size
        canvas.height = size
      }
      renderer.render({ settings, imgAspect })
    }
    draw()
    const obs = new ResizeObserver(draw)
    obs.observe(canvas)
    return () => obs.disconnect()
  }, [settings, imgAspect, image])

  return (
    <div
      className={cn(
        "relative aspect-square w-full max-w-[720px] overflow-hidden rounded-xl border shadow-sm",
        bgClass[settings.background],
      )}
    >
      <canvas ref={canvasRef} className="size-full" />
      {!image && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
          <p className="text-sm font-medium">No artwork yet</p>
          <p className="text-xs">Upload an SVG or PNG from the sidebar</p>
        </div>
      )}
    </div>
  )
}
