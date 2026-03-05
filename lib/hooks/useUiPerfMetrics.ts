"use client";

import { useEffect, useMemo, useRef, useState } from "react";

interface UiPerfMetrics {
    fpsAvg: number;
    frameP95Ms: number;
    longTaskCount: number;
    longTaskMaxMs: number;
    inputDelayAvgMs: number;
    inputDelayP95Ms: number;
}

const EMPTY_METRICS: UiPerfMetrics = {
    fpsAvg: 0,
    frameP95Ms: 0,
    longTaskCount: 0,
    longTaskMaxMs: 0,
    inputDelayAvgMs: 0,
    inputDelayP95Ms: 0,
};

function percentile(values: number[], p: number): number {
    if (!values.length) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
}

export function useUiPerfMetrics(enabled: boolean): UiPerfMetrics {
    const [metrics, setMetrics] = useState<UiPerfMetrics>(EMPTY_METRICS);
    const rafRef = useRef<number | null>(null);
    const lastFrameRef = useRef<number>(0);
    const frameSamplesRef = useRef<number[]>([]);
    const inputDelaySamplesRef = useRef<number[]>([]);
    const longTaskCountRef = useRef<number>(0);
    const longTaskMaxRef = useRef<number>(0);
    const updateTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!enabled) {
            setMetrics(EMPTY_METRICS);
            return;
        }

        frameSamplesRef.current = [];
        inputDelaySamplesRef.current = [];
        longTaskCountRef.current = 0;
        longTaskMaxRef.current = 0;
        lastFrameRef.current = performance.now();

        const onInput = (ev: Event) => {
            const stamp = (ev as any).timeStamp;
            if (typeof stamp !== "number") return;
            const delay = Math.max(0, performance.now() - stamp);
            if (Number.isFinite(delay) && delay < 10_000) {
                const arr = inputDelaySamplesRef.current;
                arr.push(delay);
                if (arr.length > 240) arr.shift();
            }
        };

        const frameLoop = (ts: number) => {
            const delta = ts - lastFrameRef.current;
            lastFrameRef.current = ts;
            if (delta > 0 && delta < 1000) {
                const arr = frameSamplesRef.current;
                arr.push(delta);
                if (arr.length > 240) arr.shift();
            }
            rafRef.current = requestAnimationFrame(frameLoop);
        };

        rafRef.current = requestAnimationFrame(frameLoop);
        window.addEventListener("pointerenter", onInput, true);
        window.addEventListener("pointerdown", onInput, true);
        window.addEventListener("click", onInput, true);

        let longTaskObserver: PerformanceObserver | null = null;
        if (typeof PerformanceObserver !== "undefined") {
            try {
                longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        longTaskCountRef.current += 1;
                        longTaskMaxRef.current = Math.max(longTaskMaxRef.current, entry.duration || 0);
                    }
                });
                longTaskObserver.observe({ entryTypes: ["longtask"] as any });
            } catch {
                longTaskObserver = null;
            }
        }

        updateTickRef.current = setInterval(() => {
            const frame = frameSamplesRef.current;
            const input = inputDelaySamplesRef.current;
            const frameAvg = frame.length ? frame.reduce((a, b) => a + b, 0) / frame.length : 0;
            const fpsAvg = frameAvg > 0 ? Math.min(120, 1000 / frameAvg) : 0;

            const inputAvg = input.length ? input.reduce((a, b) => a + b, 0) / input.length : 0;
            setMetrics({
                fpsAvg,
                frameP95Ms: percentile(frame, 0.95),
                longTaskCount: longTaskCountRef.current,
                longTaskMaxMs: longTaskMaxRef.current,
                inputDelayAvgMs: inputAvg,
                inputDelayP95Ms: percentile(input, 0.95),
            });
        }, 1000);

        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            if (updateTickRef.current) clearInterval(updateTickRef.current);
            window.removeEventListener("pointerenter", onInput, true);
            window.removeEventListener("pointerdown", onInput, true);
            window.removeEventListener("click", onInput, true);
            if (longTaskObserver) longTaskObserver.disconnect();
        };
    }, [enabled]);

    return useMemo(() => metrics, [metrics]);
}
