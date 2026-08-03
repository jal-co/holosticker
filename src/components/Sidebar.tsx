import { useRef, useState } from "react"
import { FileDown, FileUp, RotateCcw, X } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import type {
  Finish,
  HoloOverlay,
  HoloPattern,
  LayerMaterial,
  PeelDirection,
  StickerSettings,
} from "@/lib/settings"

// one-tap finish presets; each patches the finish plus the foil sliders
const finishPresets: {
  id: Finish
  label: string
  patch: Partial<StickerSettings>
}[] = [
  { id: "holo", label: "Holo", patch: { finish: "holo", holoIntensity: 0.85, grain: 0.35 } },
  { id: "gloss", label: "Glossy", patch: { finish: "gloss", holoIntensity: 0, grain: 0.05 } },
  { id: "matte", label: "Matte", patch: { finish: "matte", holoIntensity: 0, grain: 0.05 } },
  { id: "chrome", label: "Chrome", patch: { finish: "chrome", holoIntensity: 0.2, grain: 0 } },
  { id: "glitter", label: "Glitter", patch: { finish: "glitter", holoIntensity: 1, grain: 1 } },
]

interface Props {
  settings: StickerSettings
  imageName: string | null
  onChange: (patch: Partial<StickerSettings>) => void
  onUpload: (file: File) => void
  onRemove: () => void
  onExportSettings: () => void
  onImportSettings: (file: File) => void
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
      <svg
        viewBox="0 0 24 24"
        fill="currentColor"
        className="size-5"
        aria-hidden="true"
      >
        <path d="M18.5 15C18.9142 15 19.25 15.3358 19.25 15.75V17.75H21.25C21.6642 17.75 22 18.0858 22 18.5C22 18.9142 21.6642 19.25 21.25 19.25H19.25V21.25C19.25 21.6642 18.9142 22 18.5 22C18.0858 22 17.75 21.6642 17.75 21.25V19.25H15.75C15.3358 19.25 15 18.9142 15 18.5C15 18.0858 15.3358 17.75 15.75 17.75H17.75V15.75C17.75 15.3358 18.0858 15 18.5 15Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M18.25 3C19.7688 3 21 4.23122 21 5.75V14.1699C20.2645 13.7443 19.4109 13.5 18.5 13.5C16.0512 13.5 14.0149 15.2607 13.585 17.585L9.2373 13.2373C8.55392 12.5541 7.44608 12.5541 6.7627 13.2373L4.5 15.5V18.25C4.5 18.9404 5.05964 19.5 5.75 19.5H13.6006C13.7095 20.0364 13.9052 20.5409 14.1709 21H5.75C4.23122 21 3 19.7688 3 18.25V5.75C3 4.23122 4.23122 3 5.75 3H18.25ZM15 6.5C13.6193 6.5 12.5 7.61929 12.5 9C12.5 10.3807 13.6193 11.5 15 11.5C16.3807 11.5 17.5 10.3807 17.5 9C17.5 7.61929 16.3807 6.5 15 6.5Z" />
      </svg>
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
  onChange,
  onUpload,
  onRemove,
  onExportSettings,
  onImportSettings,
  onReset,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const settingsFileRef = useRef<HTMLInputElement>(null)

  return (
    <aside className="flex min-h-0 w-full flex-1 flex-col border-t bg-sidebar md:h-full md:w-80 md:flex-none md:shrink-0 md:border-t-0 md:border-r">
      <div className="px-4 py-3">
        <HoloLogo follow={!imageName} />
      </div>
      <Separator />
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-6 px-4 py-4">
          {/* Finish presets */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Finish
            </h2>
            <div
              role="radiogroup"
              aria-label="Finish preset"
              className="grid grid-cols-5 gap-0.5 rounded-lg border bg-muted/50 p-0.5"
            >
              {finishPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={settings.finish === p.id}
                  onClick={() => onChange(p.patch)}
                  className={cn(
                    "rounded-md px-0.5 py-1.5 text-[11px] font-medium transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97]",
                    settings.finish === p.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </section>

          <Separator />

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
              <div className="flex items-center gap-1.5 rounded-lg bg-accent/60 py-0.5 pl-2.5 pr-0.5">
                <span
                  className="min-w-0 flex-1 truncate text-xs text-foreground"
                  title={imageName}
                >
                  {imageName}
                </span>
                <button
                  type="button"
                  aria-label="Remove artwork"
                  onClick={onRemove}
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color] hover:bg-accent hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden />
                </button>
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
              label="Ink"
              value={settings.ink}
              min={0}
              max={2}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ ink: v })}
            />
            <SliderRow
              label="Relief"
              value={settings.relief}
              min={0}
              max={1}
              step={0.01}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => onChange({ relief: v })}
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

          {/* 3D color layers */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Layers
              </h2>
              <Switch
                checked={settings.layersOn}
                onCheckedChange={(v) => onChange({ layersOn: v })}
                aria-label="Separate colors into 3D layers"
              />
            </div>
            {settings.layersOn && (
              <>
                <SliderRow
                  label="Thickness"
                  value={settings.layerDepth}
                  min={0.002}
                  max={0.03}
                  step={0.001}
                  format={(v) => v.toFixed(3)}
                  onChange={(v) => onChange({ layerDepth: v })}
                />
                <div className="space-y-2">
                  {["Backing", "Kiss-cut", "Artwork"].map((name, i) => (
                    <div key={name} className="flex items-center gap-2">
                      <Label className="w-16 shrink-0 text-xs text-muted-foreground">
                        {name}
                      </Label>
                      <Select
                        value={settings.layerMaterials[i] ?? "auto"}
                        onValueChange={(v) => {
                          const next = [...settings.layerMaterials]
                          next[i] = v as LayerMaterial
                          onChange({ layerMaterials: next })
                        }}
                      >
                        <SelectTrigger className="h-7 w-full text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="auto">Holo foil (auto)</SelectItem>
                          <SelectItem value="gloss">Glossy</SelectItem>
                          <SelectItem value="glitter">Glitter</SelectItem>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="matte">Matte</SelectItem>
                          <SelectItem value="prism">Prism facets</SelectItem>
                          <SelectItem value="satin">Satin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </>
            )}
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
                className="mx-auto grid w-fit grid-cols-3 gap-1"
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
              Scene
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
          </section>

          <Separator />

          {/* Settings */}
          <section className="space-y-3">
            <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Settings
            </h2>
            <input
              ref={settingsFileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onImportSettings(f)
                e.target.value = ""
              }}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={onExportSettings}
                title="Download the current sliders as a JSON file"
              >
                <FileDown aria-hidden />
                Save
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => settingsFileRef.current?.click()}
                title="Load a saved settings JSON file"
              >
                <FileUp aria-hidden />
                Import
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
