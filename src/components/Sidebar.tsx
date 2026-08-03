import { useRef, useState } from "react"
import { Download, ImagePlus, RotateCcw, Settings2 } from "lucide-react"
import { HoloLogo } from "@/components/HoloLogo"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import type {
  HoloOverlay,
  HoloPattern,
  PeelDirection,
  StickerSettings,
} from "@/lib/settings"

interface Props {
  settings: StickerSettings
  imageName: string | null
  exporting: boolean
  onChange: (patch: Partial<StickerSettings>) => void
  onUpload: (file: File) => void
  onExport: () => void
  onExportSettings: () => void
  onReset: () => void
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  format?: (v: number) => string
  onChange: (v: number) => void
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  )
}

// 3×3 spatial pad, row-major; null is the inert center
const directionPad: ({ value: PeelDirection; arrow: string } | null)[] = [
  { value: "top-left", arrow: "↖" },
  { value: "top", arrow: "↑" },
  { value: "top-right", arrow: "↗" },
  { value: "left", arrow: "←" },
  null,
  { value: "right", arrow: "→" },
  { value: "bottom-left", arrow: "↙" },
  { value: "bottom", arrow: "↓" },
  { value: "bottom-right", arrow: "↘" },
]

function Dropzone({
  imageName,
  onUpload,
  onOpen,
}: {
  imageName: string | null
  onUpload: (file: File) => void
  onOpen: () => void
}) {
  const [over, setOver] = useState(false)
  return (
    <button
      type="button"
      onClick={onOpen}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) onUpload(f)
      }}
      className={cn(
        "flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-5 text-center transition-[color,background-color,border-color]",
        over
          ? "border-ring bg-accent text-foreground"
          : "border-input text-muted-foreground hover:border-ring/60 hover:bg-accent/50 hover:text-foreground",
      )}
    >
      <ImagePlus className="size-5" strokeWidth={1.5} aria-hidden />
      <span className="text-xs font-medium text-foreground">
        {imageName ? "Replace artwork" : "Upload artwork"}
      </span>
      <span className="text-[11px]">
        Drop or click · SVG, PNG, JPG, WebP
      </span>
    </button>
  )
}

export function Sidebar({
  settings,
  imageName,
  exporting,
  onChange,
  onUpload,
  onExport,
  onExportSettings,
  onReset,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-r bg-sidebar">
      <div className="px-4 py-3">
        <HoloLogo follow={!imageName} />
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4">
          {/* Artwork */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Artwork
            </h2>
            <input
              ref={fileRef}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onUpload(f)
                e.target.value = ""
              }}
            />
            <Dropzone
              imageName={imageName}
              onUpload={onUpload}
              onOpen={() => fileRef.current?.click()}
            />
            {imageName && (
              <div className="flex items-center gap-2 rounded-lg bg-accent/60 px-2.5 py-1.5">
                <span
                  className="min-w-0 flex-1 truncate text-xs text-foreground"
                  title={imageName}
                >
                  {imageName}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  loaded
                </span>
              </div>
            )}
            <SliderRow
              label="Sticker size"
              value={settings.size}
              min={0.3}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ size: v })}
            />
            <SliderRow
              label="Die-cut border"
              value={settings.border}
              min={0}
              max={0.08}
              step={0.001}
              format={(v) => v.toFixed(3)}
              onChange={(v) => onChange({ border: v })}
            />
            <SliderRow
              label="Cut tolerance"
              value={settings.cutTolerance}
              min={0}
              max={0.12}
              step={0.005}
              format={(v) => v.toFixed(3)}
              onChange={(v) => onChange({ cutTolerance: v })}
            />
          </section>

          <Separator />

          {/* Holographic foil */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Holographic foil
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Pattern</Label>
              <Select
                value={settings.pattern}
                onValueChange={(v) => onChange({ pattern: v as HoloPattern })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">Linear bands</SelectItem>
                  <SelectItem value="radial">Radial burst</SelectItem>
                  <SelectItem value="patches">Foil patches</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Refractor overlay</Label>
              <Select
                value={settings.overlay}
                onValueChange={(v) => onChange({ overlay: v as HoloOverlay })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="triangles">Triangles</SelectItem>
                  <SelectItem value="squares">Squares</SelectItem>
                  <SelectItem value="stripes">Stripes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <SliderRow
              label="Intensity"
              value={settings.holoIntensity}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ holoIntensity: v })}
            />
            <SliderRow
              label="Band frequency"
              value={settings.bands}
              min={1}
              max={20}
              step={0.5}
              format={(v) => v.toFixed(1)}
              onChange={(v) => onChange({ bands: v })}
            />
            <SliderRow
              label="Hue shift"
              value={settings.hueShift}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 360)}°`}
              onChange={(v) => onChange({ hueShift: v })}
            />
            <SliderRow
              label="Grain / sparkle"
              value={settings.grain}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ grain: v })}
            />
            <SliderRow
              label="Light X"
              value={settings.light.x}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) =>
                onChange({ light: { ...settings.light, x: v } })
              }
            />
            <SliderRow
              label="Light Y"
              value={settings.light.y}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) =>
                onChange({ light: { ...settings.light, y: v } })
              }
            />
          </section>

          <Separator />

          {/* Peel */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Peel
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Direction</Label>
              <div
                role="radiogroup"
                aria-label="Peel direction"
                className="grid w-fit grid-cols-3 gap-1"
              >
                {directionPad.map((d, i) =>
                  d ? (
                    <button
                      key={d.value}
                      type="button"
                      role="radio"
                      aria-checked={settings.peelDirection === d.value}
                      aria-label={d.value.replace("-", " ")}
                      onClick={() => onChange({ peelDirection: d.value })}
                      className={cn(
                        "flex size-9 items-center justify-center rounded-lg border text-sm transition-[color,background-color,border-color]",
                        settings.peelDirection === d.value
                          ? "border-transparent bg-primary text-primary-foreground"
                          : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {d.arrow}
                    </button>
                  ) : (
                    <span
                      key={`c${i}`}
                      className="flex size-9 items-center justify-center text-muted-foreground/40"
                      aria-hidden
                    >
                      ·
                    </span>
                  ),
                )}
              </div>
            </div>
            <SliderRow
              label="Peel amount"
              value={settings.peelAmount}
              min={0}
              max={0.9}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ peelAmount: v })}
            />
            <SliderRow
              label="Curl radius"
              value={settings.curl}
              min={0.02}
              max={0.25}
              step={0.005}
              onChange={(v) => onChange({ curl: v })}
            />
            <SliderRow
              label="Shadow"
              value={settings.shadow}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ shadow: v })}
            />
          </section>

          <Separator />

          {/* Scene & export */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Scene &amp; export
            </h2>
            <div className="space-y-2">
              <Label className="text-xs">Background</Label>
              <Select
                value={settings.background}
                onValueChange={(v) =>
                  onChange({
                    background: v as StickerSettings["background"],
                  })
                }
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
            <div className="space-y-2">
              <Label className="text-xs">Export size</Label>
              <Select
                value={String(settings.exportSize)}
                onValueChange={(v) => onChange({ exportSize: Number(v) })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1024">1024 × 1024</SelectItem>
                  <SelectItem value="2048">2048 × 2048</SelectItem>
                  <SelectItem value="4096">4096 × 4096</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!imageName || exporting}
              onClick={onExport}
            >
              <Download aria-hidden />
              {exporting ? "Exporting…" : "Export PNG"}
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onExportSettings}
              >
                <Settings2 aria-hidden />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 text-muted-foreground"
                onClick={onReset}
              >
                <RotateCcw aria-hidden />
                Reset
              </Button>
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  )
}
