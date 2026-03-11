(function() {
	const MINIMAP_MAX_LINE_CHARS = 100;
	const MINIMAP_PIXEL_ALPHA = .5;
	const MINIMAP_TOKEN_TYPES = [
		"keyword",
		"function",
		"identifier",
		"string",
		"number",
		"boolean",
		"null",
		"operator",
		"punctuation",
		"comment",
		"text",
		"special"
	];
	const themePaletteCache = /* @__PURE__ */ new Map();
	function clampByte(value) {
		return Math.max(0, Math.min(255, value | 0));
	}
	function parseHexColor(color) {
		const hex = color.slice(1);
		if (hex.length === 3 || hex.length === 4) {
			const r = parseInt(hex[0] + hex[0], 16);
			const g = parseInt(hex[1] + hex[1], 16);
			const b = parseInt(hex[2] + hex[2], 16);
			if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
			return {
				r,
				g,
				b
			};
		}
		if (hex.length === 6 || hex.length === 8) {
			const r = parseInt(hex.slice(0, 2), 16);
			const g = parseInt(hex.slice(2, 4), 16);
			const b = parseInt(hex.slice(4, 6), 16);
			if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
			return {
				r,
				g,
				b
			};
		}
		return null;
	}
	function parseRgbColor(color) {
		const match = color.match(/^rgba?\((.+)\)$/i);
		if (!match) return null;
		const parts = match[1].split(",").map((part) => part.trim());
		if (parts.length < 3) return null;
		const parseChannel = (value) => {
			if (value.endsWith("%")) {
				const percent = Number.parseFloat(value.slice(0, -1));
				if (!Number.isFinite(percent)) return null;
				return clampByte(Math.round(percent * 2.55));
			}
			const numeric = Number.parseFloat(value);
			if (!Number.isFinite(numeric)) return null;
			return clampByte(Math.round(numeric));
		};
		const r = parseChannel(parts[0]);
		const g = parseChannel(parts[1]);
		const b = parseChannel(parts[2]);
		if (r == null || g == null || b == null) return null;
		return {
			r,
			g,
			b
		};
	}
	function parseColorToRgb(color, fallback) {
		if (!color) return fallback;
		const normalized = color.trim().toLowerCase();
		return (normalized.startsWith("#") ? parseHexColor(normalized) : normalized.startsWith("rgb") ? parseRgbColor(normalized) : null) ?? fallback;
	}
	function getThemeCacheKey(theme) {
		const parts = new Array(MINIMAP_TOKEN_TYPES.length + 1);
		for (let i = 0; i < MINIMAP_TOKEN_TYPES.length; i++) {
			const tokenType = MINIMAP_TOKEN_TYPES[i];
			parts[i] = theme.byTokenType[tokenType] ?? "";
		}
		parts[MINIMAP_TOKEN_TYPES.length] = theme.textColor ?? "";
		return parts.join("|");
	}
	function getTokenPalette(theme) {
		const cacheKey = getThemeCacheKey(theme);
		const cached = themePaletteCache.get(cacheKey);
		if (cached) return cached;
		const palette = {};
		const fallback = parseColorToRgb(theme.textColor, {
			r: 255,
			g: 255,
			b: 255
		});
		for (let i = 0; i < MINIMAP_TOKEN_TYPES.length; i++) {
			const tokenType = MINIMAP_TOKEN_TYPES[i];
			palette[tokenType] = parseColorToRgb(theme.byTokenType[tokenType], fallback);
		}
		themePaletteCache.set(cacheKey, palette);
		return palette;
	}
	function isWhitespace(text) {
		if (text.length === 0) return false;
		for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) > 32) return false;
		return true;
	}
	function mapSpan(startChar, length, columnCount, columnScale) {
		if (length <= 0) return null;
		const start = Math.max(0, startChar);
		const end = Math.max(start + 1, start + length);
		let colStart = Math.floor(start * columnScale);
		let colEnd = Math.ceil(end * columnScale);
		if (colStart >= columnCount) return null;
		if (colStart < 0) colStart = 0;
		if (colEnd <= colStart) colEnd = colStart + 1;
		if (colEnd > columnCount) colEnd = columnCount;
		return [colStart, colEnd];
	}
	function drawTokenLine(lineTokens, palette, rowHits, rowColorR, rowColorG, rowColorB, rowColorN, columnCount, columnScale) {
		if (!lineTokens || lineTokens.length === 0) return;
		let charCursor = 0;
		for (let tokenIndex = 0; tokenIndex < lineTokens.length; tokenIndex++) {
			const token = lineTokens[tokenIndex];
			const tokenText = token?.text ?? "";
			if (tokenText.length === 0) continue;
			const start = charCursor;
			charCursor += tokenText.length;
			const tokenType = token?.type ?? "text";
			if (tokenType === "text" && isWhitespace(tokenText)) continue;
			const mapped = mapSpan(start, tokenText.length, columnCount, columnScale);
			if (!mapped) continue;
			const color = palette[tokenType] ?? palette.text;
			for (let col = mapped[0]; col < mapped[1]; col++) {
				rowHits[col] = 1;
				rowColorR[col] += color.r;
				rowColorG[col] += color.g;
				rowColorB[col] += color.b;
				rowColorN[col] = Math.min(255, rowColorN[col] + 1);
			}
		}
	}
	function renderChunkBitmap(message) {
		const width = Math.max(1, message.columnCount | 0);
		const height = Math.max(1, message.rowCount * message.rowScale | 0);
		const canvas = new OffscreenCanvas(width, height);
		const c = canvas.getContext("2d");
		if (!c) throw new Error("minimap worker: failed to create 2d context");
		const imageData = c.createImageData(width, height);
		const image = imageData.data;
		const alpha = clampByte(Math.round(MINIMAP_PIXEL_ALPHA * 255));
		const rowHits = new Uint8Array(width);
		const rowColorR = new Uint16Array(width);
		const rowColorG = new Uint16Array(width);
		const rowColorB = new Uint16Array(width);
		const rowColorN = new Uint8Array(width);
		const palette = getTokenPalette(message.theme);
		const columnScale = width / MINIMAP_MAX_LINE_CHARS;
		let hasInk = false;
		for (let row = 0; row < message.rowCount; row++) {
			rowHits.fill(0);
			rowColorR.fill(0);
			rowColorG.fill(0);
			rowColorB.fill(0);
			rowColorN.fill(0);
			const lineStart = row * message.lineSpan;
			const lineEnd = Math.min(message.tokenLines.length, lineStart + message.lineSpan);
			for (let lineIndex = lineStart; lineIndex < lineEnd; lineIndex++) drawTokenLine(message.tokenLines[lineIndex], palette, rowHits, rowColorR, rowColorG, rowColorB, rowColorN, width, columnScale);
			for (let scaleRow = 0; scaleRow < message.rowScale; scaleRow++) {
				const bitmapRow = row * message.rowScale + scaleRow;
				if (bitmapRow >= height) break;
				const rowOffset = bitmapRow * width * 4;
				for (let col = 0; col < width; col++) {
					if (rowHits[col] !== 1) continue;
					hasInk = true;
					const offset = rowOffset + col * 4;
					const n = Math.max(1, rowColorN[col]);
					image[offset] = clampByte(Math.round(rowColorR[col] / n));
					image[offset + 1] = clampByte(Math.round(rowColorG[col] / n));
					image[offset + 2] = clampByte(Math.round(rowColorB[col] / n));
					image[offset + 3] = alpha;
				}
			}
		}
		c.putImageData(imageData, 0, 0);
		return {
			bitmap: canvas.transferToImageBitmap(),
			hasInk
		};
	}
	function postError(requestId, contextId, error) {
		const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
		self.postMessage({
			type: "minimapError",
			requestId,
			contextId,
			error: detail
		});
	}
	self.onmessage = (event) => {
		const message = event.data;
		if (!message || message.type !== "minimapRenderChunk") return;
		try {
			const rendered = renderChunkBitmap(message);
			const response = {
				type: "minimapRenderChunkResult",
				requestId: message.requestId,
				contextId: message.contextId,
				revision: message.revision,
				tokenVersion: message.tokenVersion,
				compressionKey: message.compressionKey,
				contentKey: message.contentKey,
				chunkIndex: message.chunkIndex,
				chunkStartRow: message.chunkStartRow,
				rowCount: message.rowCount,
				lineSpan: message.lineSpan,
				columnCount: message.columnCount,
				rowScale: message.rowScale,
				hasInk: rendered.hasInk,
				bitmap: rendered.bitmap
			};
			self.postMessage(response, [response.bitmap]);
		} catch (error) {
			postError(message.requestId, message.contextId, error);
		}
	};
})();

//# sourceMappingURL=minimap-worker-ufmyyTr7.js.map