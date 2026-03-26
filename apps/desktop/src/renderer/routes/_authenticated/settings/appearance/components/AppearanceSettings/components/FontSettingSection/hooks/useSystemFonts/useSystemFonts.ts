import { useEffect, useState } from "react";

export type FontCategory = "nerd" | "mono" | "other";

export interface FontInfo {
	family: string;
	category: FontCategory;
}

/**
 * Fonts registered via @font-face that load from the OS at runtime
 * (not bundled in the app binary). Always shown in the dropdown on
 * supported platforms.
 */
const REGISTERED_FONTS: FontInfo[] = navigator.platform.startsWith("Mac")
	? [{ family: "SF Mono", category: "mono" }]
	: [];
const PLATFORM = navigator.userAgentData?.platform ?? navigator.platform ?? "";
const IS_LINUX = /^Linux/i.test(PLATFORM);
// queryLocalFonts has been observed to hang on Linux desktops; keep the fast
// known-font path there and reserve local font enumeration for platforms where
// it returns promptly.
const SHOULD_QUERY_LOCAL_FONTS =
	typeof window.queryLocalFonts === "function" && !IS_LINUX;

const WELL_KNOWN_NERD: string[] = [
	"MesloLGM Nerd Font",
	"MesloLGS Nerd Font",
	"FiraCode Nerd Font",
	"Hack Nerd Font",
	"CaskaydiaCove Nerd Font",
	"CaskaydiaMono Nerd Font",
	"RobotoMono Nerd Font",
	"UbuntuMono Nerd Font",
	"SourceCodePro Nerd Font",
];

const WELL_KNOWN_MONO: string[] = [
	"Fira Code",
	"JetBrains Mono",
	"Menlo",
	"Monaco",
	"Consolas",
	"Hack",
	"Source Code Pro",
	"Cascadia Code",
	"Cascadia Mono",
	"IBM Plex Mono",
	"Inconsolata",
	"Roboto Mono",
	"Ubuntu Mono",
	"Victor Mono",
	"Iosevka",
	"Geist Mono",
	"Input Mono",
	"DejaVu Sans Mono",
	"Fira Mono",
	"PT Mono",
	"Noto Sans Mono",
	"Anonymous Pro",
	"Liberation Mono",
	"Droid Sans Mono",
	"Courier New",
];

const KNOWN_MONO_SET = new Set([
	...WELL_KNOWN_MONO,
	...WELL_KNOWN_NERD,
	...REGISTERED_FONTS.map((f) => f.family),
]);

// Reuse a single canvas context for all font measurements
let sharedCtx: CanvasRenderingContext2D | null = null;
function getCanvasCtx(): CanvasRenderingContext2D | null {
	if (!sharedCtx) {
		sharedCtx = document.createElement("canvas").getContext("2d");
	}
	return sharedCtx;
}

function isFontAvailable(family: string): boolean {
	const ctx = getCanvasCtx();
	if (!ctx) return false;

	const testString = "mmmmmmmmmmlli10OQ@#$%";
	const fallbacks = ["monospace", "sans-serif"] as const;

	for (const fallback of fallbacks) {
		ctx.font = `72px ${fallback}`;
		const fallbackWidth = ctx.measureText(testString).width;

		ctx.font = `72px "${family}", ${fallback}`;
		const testWidth = ctx.measureText(testString).width;

		if (Math.abs(testWidth - fallbackWidth) > 0.5) {
			return true;
		}
	}
	return false;
}

function classifyFont(family: string): FontCategory {
	if (/Nerd Font/i.test(family) || / NF$/i.test(family)) {
		return "nerd";
	}
	if (KNOWN_MONO_SET.has(family)) {
		return "mono";
	}
	return "other";
}

function isMonospaceByMeasurement(family: string): boolean {
	const ctx = getCanvasCtx();
	if (!ctx) return false;
	ctx.font = `16px "${family}"`;
	const narrowWidth = ctx.measureText("iiiiii").width;
	const wideWidth = ctx.measureText("MMMMMM").width;
	return Math.abs(narrowWidth - wideWidth) < 1;
}

function discoverSystemFonts(): FontInfo[] {
	const result: FontInfo[] = [];
	for (const family of WELL_KNOWN_NERD) {
		if (isFontAvailable(family)) {
			result.push({ family, category: "nerd" });
		}
	}
	for (const family of WELL_KNOWN_MONO) {
		if (isFontAvailable(family)) {
			result.push({ family, category: "mono" });
		}
	}
	return result;
}

let cachedFonts: FontInfo[] | null = null;
let pendingFontsPromise: Promise<FontInfo[]> | null = null;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise<T>((resolve, reject) => {
		const timeout = window.setTimeout(() => {
			reject(new Error(`Timed out after ${timeoutMs}ms`));
		}, timeoutMs);

		promise.then(
			(value) => {
				window.clearTimeout(timeout);
				resolve(value);
			},
			(error) => {
				window.clearTimeout(timeout);
				reject(error);
			},
		);
	});
}

async function loadFonts(): Promise<FontInfo[]> {
	await document.fonts.ready;

	const result: FontInfo[] = [];
	const seen = new Set<string>();

	for (const font of REGISTERED_FONTS) {
		if (isFontAvailable(font.family)) {
			result.push(font);
			seen.add(font.family);
		}
	}

	for (const font of discoverSystemFonts()) {
		if (!seen.has(font.family)) {
			seen.add(font.family);
			result.push(font);
		}
	}

	if (SHOULD_QUERY_LOCAL_FONTS) {
		try {
			const fontData = await withTimeout(window.queryLocalFonts!(), 3000);
			for (const fd of fontData) {
				if (seen.has(fd.family)) continue;
				seen.add(fd.family);

				let category = classifyFont(fd.family);
				if (category === "other" && isMonospaceByMeasurement(fd.family)) {
					category = "mono";
				}
				result.push({ family: fd.family, category });
			}
		} catch (err) {
			console.warn("[useSystemFonts] queryLocalFonts failed:", err);
		}
	}

	result.sort((a, b) => a.family.localeCompare(b.family));
	return result;
}

export function useSystemFonts() {
	const [fonts, setFonts] = useState<FontInfo[]>(cachedFonts ?? []);
	const [isLoading, setIsLoading] = useState(cachedFonts === null);

	useEffect(() => {
		if (cachedFonts) {
			setFonts(cachedFonts);
			setIsLoading(false);
			return;
		}

		let cancelled = false;

		if (!pendingFontsPromise) {
			// Coalesce concurrent mounts into one font scan so settings screens do not
			// trigger multiple expensive enumerations in parallel.
			pendingFontsPromise = loadFonts()
				.then((result) => {
					cachedFonts = result;
					return result;
				})
				.finally(() => {
					pendingFontsPromise = null;
				});
		}

		pendingFontsPromise
			.then((result) => {
				if (cancelled) return;
				setFonts(result);
				setIsLoading(false);
			})
			.catch((err) => {
				if (cancelled) return;
				setIsLoading(false);
				console.warn("[useSystemFonts] Font loading failed:", err);
			});
		return () => {
			cancelled = true;
		};
	}, []);

	return { fonts, isLoading };
}
