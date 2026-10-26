"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser, PenLine, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  encodeReportSignature,
  parseReportSignature,
  type SignaturePoint,
  type SignatureStrokes,
} from "@/lib/report-signature";

type SignatureFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
};

function renderStrokes(canvas: HTMLCanvasElement, strokes: SignatureStrokes) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, width, height);
  context.strokeStyle = "#172033";
  context.lineWidth = 2;
  context.lineCap = "round";
  context.lineJoin = "round";

  strokes.forEach((stroke) => {
    if (!stroke.length) return;
    context.beginPath();
    stroke.forEach(([x, y], index) => {
      const px = x * width;
      const py = y * height;
      if (index === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    });
    if (stroke.length === 1) {
      const [x, y] = stroke[0];
      context.lineTo(x * width + 0.5, y * height + 0.5);
    }
    context.stroke();
  });
}

export function SignatureField({ id, label, value, onChange }: SignatureFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<SignatureStrokes>(parseReportSignature(value) || []);
  const activeStrokeRef = useRef<SignaturePoint[] | null>(null);
  const [mode, setMode] = useState<"draw" | "type">(
    parseReportSignature(value) ? "draw" : "type",
  );

  useEffect(() => {
    const parsed = parseReportSignature(value);
    if (parsed) strokesRef.current = parsed;
    if (mode === "draw" && canvasRef.current) {
      renderStrokes(canvasRef.current, parsed || strokesRef.current);
    }
  }, [mode, value]);

  useEffect(() => {
    if (mode !== "draw" || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const redraw = () => renderStrokes(canvas, strokesRef.current);
    redraw();
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [mode]);

  const pointFromPointer = (event: React.PointerEvent<HTMLCanvasElement>): SignaturePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return [
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    ];
  };

  const startStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const stroke = [pointFromPointer(event)];
    activeStrokeRef.current = stroke;
    strokesRef.current = [...strokesRef.current, stroke];
    renderStrokes(event.currentTarget, strokesRef.current);
  };

  const extendStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current.push(pointFromPointer(event));
    renderStrokes(event.currentTarget, strokesRef.current);
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!activeStrokeRef.current) return;
    activeStrokeRef.current = null;
    onChange(encodeReportSignature(strokesRef.current));
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const clear = () => {
    strokesRef.current = [];
    activeStrokeRef.current = null;
    onChange("");
    if (canvasRef.current) renderStrokes(canvasRef.current, []);
  };

  const switchMode = (nextMode: "draw" | "type") => {
    if (nextMode === mode) return;
    clear();
    setMode(nextMode);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-medium text-foreground">{label}</Label>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant={mode === "draw" ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]" onClick={() => switchMode("draw")}>
            <PenLine className="mr-1 h-3.5 w-3.5" /> Draw
          </Button>
          <Button type="button" size="sm" variant={mode === "type" ? "secondary" : "ghost"} className="h-7 px-2 text-[11px]" onClick={() => switchMode("type")}>
            <Type className="mr-1 h-3.5 w-3.5" /> Type
          </Button>
        </div>
      </div>

      {mode === "draw" ? (
        <div className="relative overflow-hidden rounded-md border border-border bg-background">
          <canvas
            ref={canvasRef}
            id={id}
            aria-label={`${label} drawing area`}
            className="h-32 w-full touch-none cursor-crosshair"
            onPointerDown={startStroke}
            onPointerMove={extendStroke}
            onPointerUp={finishStroke}
            onPointerCancel={finishStroke}
          />
          <Button type="button" variant="ghost" size="sm" className="absolute right-1.5 top-1.5 h-7 px-2 text-[11px]" onClick={clear}>
            <Eraser className="mr-1 h-3.5 w-3.5" /> Clear
          </Button>
          <div className="pointer-events-none absolute inset-x-4 bottom-5 border-b border-dashed border-muted-foreground/35" />
        </div>
      ) : (
        <Input
          id={id}
          value={parseReportSignature(value) ? "" : value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Type the signer's name"
          className="h-9 text-xs bg-background shadow-none"
        />
      )}
    </div>
  );
}
