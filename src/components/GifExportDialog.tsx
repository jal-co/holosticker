import { useEffect, useRef, useState } from "react"
import { Dialog } from "radix-ui"
import { Clapperboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { gifPeelPose, HoloRenderer, type GifAnim } from "@/lib/three-renderer"
import type { StickerSettings } from "@/lib/settings"
import { cn } from "@/lib/utils"

type GifBackground = "transparent" | "white" | "black"

const bgClass: Record<GifBackground, string> = {
  transparent:
    "bg-[length:20px_20px] bg-[image:repeating-conic-gradient(oklch(0.94_0_0)_0%_25%,white_0%_50%)] dark:bg-[image:repeating-conic-gradient(oklch(0.24_0_0)_0%_25%,oklch(0.2_0_0)_0%_50%)]",
  white: "bg-white",
  black: "bg-black",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  image: ImageBitmap | null
  imgAspect: number
  settings: StickerSettings
  progress: number | null
  onExport: (opts: {
    anim: GifAnim
    background: GifBackground
    speed: number
  }) => void
}

export function GifExportDialog({
  open,
  onOpenChange,
  image,
  imgAspect,
  settings,
  progress,
  onExport,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rendererRef = useRef<HoloRenderer | null>(null)
  const lastImageRef = useRef<ImageBitmap | null | undefined>(undefined)
  const [anim, setAnim] = useState<GifAnim>("sweep")
  const [background, setBackground] = useState<GifBackground>("transparent")
  const [speed, setSpeed] = useState(1)

  // live looping preview of the chosen animation
  useEffect(() => {
    if (!open) return
    let raf = 0
    const loopMs = (anim === "peel" ? 2880 : 2400) / speed
    const draw = () => {
      raf = requestAnimationFrame(draw)
      const canvas = canvasRef.current
      if (!canvas) return // portal content not mounted yet, retry
      if (!rendererRef.current) {
        rendererRef.current = new HoloRenderer(canvas)
      }
      const renderer = rendererRef.current
      if (lastImageRef.current !== image) {
        renderer.setImage(image)
        lastImageRef.current = image
      }
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const size = Math.round(canvas.clientWidth * dpr)
      if (size > 0 && (canvas.width !== size || canvas.height !== size)) {
        canvas.width = size
        canvas.height = size
      }
      if (canvas.width === 0) return
      const t = (performance.now() % loopMs) / loopMs
      let frameSettings = settings
      let flyOff = 0
      if (anim === "sweep") {
        const a = t * Math.PI * 2
        renderer.setTilt(Math.sin(a) * 0.85, Math.cos(a) * 0.55)
      } else {
        renderer.setTilt(0, 0)
        const pose = gifPeelPose(t)
        frameSettings = { ...settings, peelAmount: pose.peel }
        flyOff = pose.fly
      }
      renderer.render({ settings: frameSettings, imgAspect, flyOff })
    }
    draw()
    return () => cancelAnimationFrame(raf)
  }, [open, anim, speed, image, imgAspect, settings])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[min(26rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border bg-background p-4 shadow-lg outline-none">
          <div className="mb-3 flex items-center justify-between">
            <Dialog.Title className="text-sm font-semibold">
              Export GIF
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label="Close"
              >
                <X aria-hidden />
              </Button>
            </Dialog.Close>
          </div>

          <div
            className={cn(
              "relative aspect-square w-full overflow-hidden rounded-lg border",
              bgClass[background],
            )}
          >
            <canvas ref={canvasRef} className="size-full" />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Animation</Label>
              <Select value={anim} onValueChange={(v) => setAnim(v as GifAnim)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sweep">Holo sweep</SelectItem>
                  <SelectItem value="peel">Peel off & restick</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Background</Label>
              <Select
                value={background}
                onValueChange={(v) => setBackground(v as GifBackground)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transparent">Transparent</SelectItem>
                  <SelectItem value="white">White</SelectItem>
                  <SelectItem value="black">Black</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Speed</Label>
              <span className="text-xs tabular-nums text-muted-foreground">
                {speed.toFixed(2)}×
              </span>
            </div>
            <Slider
              value={[speed]}
              min={0.5}
              max={2}
              step={0.05}
              onValueChange={([v]) => setSpeed(v)}
            />
          </div>

          <Button
            className="mt-3 w-full"
            disabled={progress !== null}
            onClick={() => onExport({ anim, background, speed })}
          >
            <Clapperboard aria-hidden />
            {progress !== null ? `Encoding… ${progress}%` : "Export GIF"}
          </Button>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
