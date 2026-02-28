(function() {
	function Deferred() {
		const _onwhen = () => {
			deferred.hasSettled = true;
			deferred.resolve = deferred.reject = noop;
		};
		const noop = () => {};
		let onwhen = _onwhen;
		const deferred = {
			hasSettled: false,
			when: (fn) => {
				onwhen = () => {
					_onwhen();
					fn();
				};
			}
		};
		deferred.promise = new Promise((resolve, reject) => {
			deferred.resolve = (arg) => {
				onwhen();
				deferred.value = arg;
				resolve(arg);
			};
			deferred.reject = (error) => {
				onwhen();
				deferred.error = error;
				reject(error);
			};
		});
		return deferred;
	}
	const Getter = (cb, target = {}) => new Proxy(target, { get: (_, key) => cb(key) });
	const defaultTransferables = [typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : void 0, typeof MessagePort !== "undefined" ? MessagePort : void 0].filter(Boolean);
	const rpc = (port, api = {}, transferables = defaultTransferables) => {
		const xfer = (args, transferables$1) => args.reduce((p, n) => {
			if (typeof n === "object") {
				if (transferables$1.some((ctor) => n instanceof ctor)) p.push(n);
				else for (const key in n) if (n[key] && transferables$1.some((ctor) => n[key] instanceof ctor)) p.push(n[key]);
			}
			return p;
		}, []);
		let callbackId = 0;
		const calls = /* @__PURE__ */ new Map();
		port.onmessage = async ({ data }) => {
			const { cid } = data;
			if (data.method) {
				let result;
				try {
					if (!(data.method in api)) throw new TypeError(`Method "${data.method}" does not exist in RPC API.`);
					if (typeof api[data.method] !== "function") throw new TypeError(`Property "${data.method}" exists in RPC but is not type function, instead it is type: "${typeof api[data.method]}"`);
					result = await api[data.method](...data.args);
					port.postMessage({
						cid,
						result
					}, xfer([result], transferables));
				} catch (error) {
					port.postMessage({
						cid,
						error
					});
				}
			} else {
				if (!calls.has(cid)) {
					console.log(cid, calls.size, Object.keys(data.result));
					throw new ReferenceError("Callback id not found: " + cid);
				}
				const { resolve, reject } = calls.get(cid);
				calls.delete(data.cid);
				if (data.error) reject(data.error);
				else resolve(data.result);
			}
		};
		const call = (method, ...args) => {
			const cid = ++callbackId;
			const deferred = Deferred();
			calls.set(cid, deferred);
			try {
				port.postMessage({
					method,
					args,
					cid
				}, xfer(args, transferables));
			} catch (error) {
				console.error(`Rpc call failed: "${method}"`, args.map((x) => x.constructor.name + ": " + x.toString()), error);
			}
			return deferred.promise;
		};
		return Getter((key) => key === "then" ? void 0 : call.bind(null, key), call);
	};
	const allocations = /* @__PURE__ */ new Map();
	function ensureCategory(byCategory, cat) {
		if (!byCategory[cat]) byCategory[cat] = {
			count: 0,
			bytes: 0,
			bySource: {}
		};
		return byCategory[cat];
	}
	function addToBySource(bySource, source, bytes) {
		const cur = bySource[source] ?? {
			count: 0,
			bytes: 0
		};
		cur.count += 1;
		cur.bytes += bytes;
		bySource[source] = cur;
	}
	function track(id, category, bytes, meta) {
		const source = meta?.source ?? "unknown";
		allocations.set(id, {
			id,
			category,
			bytes,
			meta: {
				...meta,
				source
			},
			at: Date.now()
		});
	}
	function getSnapshot() {
		const byCategory = {};
		let totalBytes = 0;
		const entries = Array.from(allocations.values());
		for (const a of entries) {
			const cat = ensureCategory(byCategory, a.category);
			cat.count += 1;
			cat.bytes += a.bytes;
			totalBytes += a.bytes;
			const src = a.meta?.source ?? "unknown";
			addToBySource(cat.bySource, src, a.bytes);
		}
		return {
			allocations: entries,
			byCategory,
			totalBytes
		};
	}
	function computePeaks(ch0, w) {
		const len = ch0.length | 0;
		const outW = Math.max(1, w | 0);
		const out = new Float32Array(outW * 2);
		if (len <= 0) {
			out.fill(0);
			return out;
		}
		for (let i = 0; i < outW; i++) {
			const from = Math.floor(i * len / outW);
			const to = Math.floor((i + 1) * len / outW);
			const a = Math.max(0, Math.min(len - 1, from));
			const b = Math.max(a + 1, Math.min(len, to));
			let mn = ch0[a] ?? 0;
			let mx = mn;
			for (let j = a + 1; j < b; j++) {
				const v = ch0[j] ?? 0;
				if (v < mn) mn = v;
				if (v > mx) mx = v;
			}
			const base = i * 2;
			out[base] = mn;
			out[base + 1] = mx;
		}
		return out;
	}
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
	function detectSlices(samples, threshold, max) {
		const m = Math.max(1, max | 0);
		const points = new Int32Array(m);
		const len = samples.length | 0;
		if (len <= 0) return {
			points,
			count: 0
		};
		let count = 0;
		const thr = clamp(threshold, 0, 1);
		const desiredBuckets = Math.max(256, Math.min(16384, m * 16 | 0));
		const maxBucketsByMinSize = Math.max(1, Math.floor(len / 32));
		const bucketCount = Math.max(1, Math.min(len, desiredBuckets, maxBucketsByMinSize));
		if (bucketCount <= 1) {
			points[0] = 0;
			return {
				points,
				count: 1
			};
		}
		const peaks = computePeaks(samples, bucketCount);
		const rise = new Float32Array(bucketCount);
		let riseMax = 0;
		let prevAmp = 0;
		for (let i = 0; i < bucketCount; i++) {
			const base = i * 2;
			const mn = peaks[base] ?? 0;
			const mx = peaks[base + 1] ?? 0;
			const amp = Math.max(Math.abs(mn), Math.abs(mx));
			const d = i === 0 ? 0 : Math.max(0, amp - prevAmp);
			rise[i] = d;
			if (d > riseMax) riseMax = d;
			prevAmp = amp;
		}
		if (riseMax <= 0) {
			points[0] = 0;
			return {
				points,
				count: 1
			};
		}
		const minRise = riseMax * (.02 + thr * .28);
		const noveltyMin = riseMax * (.01 + thr * .18);
		const ratioMin = thr * .9;
		const minDistanceBuckets = 1 + (thr * 24 | 0);
		const rearmLevel = riseMax * (.006 + thr * .06);
		const cooldownFrames = 1 + (thr * 10 | 0);
		const fastCoeff = .25;
		const slowCoeff = .02;
		let fast = rise[0] ?? 0;
		let slow = fast;
		let prev2 = 0;
		let prev1 = 0;
		let prevFast1 = fast;
		let prevSlow1 = slow;
		let lastPeakBucket = -1073741823;
		let armed = true;
		let cooldown = 0;
		let mg = 0;
		const bucketStart = (b) => Math.floor(b * len / bucketCount);
		for (let frame = 1; frame < bucketCount && count < m; frame++) {
			const e = rise[frame] ?? 0;
			fast += (e - fast) * fastCoeff;
			slow += (e - slow) * slowCoeff;
			const novelty = Math.max(0, fast - slow);
			const release = .995 + thr * .01;
			mg *= release;
			const mgMul = 1 + mg * (10 + thr * 12);
			const effMinRise = minRise * mgMul;
			const effNoveltyMin = noveltyMin * mgMul;
			const baseMinDistanceBuckets = Math.max(2, Math.floor(minDistanceBuckets * (1 + mg * 2)));
			const effMinDistanceBuckets = count <= 2 ? Math.max(baseMinDistanceBuckets, 4 + (thr * 8 | 0)) : baseMinDistanceBuckets;
			if (!armed && novelty <= rearmLevel) armed = true;
			if (cooldown > 0) cooldown--;
			if (frame >= 2) {
				if (prev1 > prev2 && prev1 >= novelty) {
					const posBucket = frame - 1 | 0;
					const bucketDelta = posBucket - lastPeakBucket;
					const base = Math.max(prevSlow1, riseMax * 1e-5);
					const ratio = prevFast1 / base;
					if (armed && cooldown <= 0 && bucketDelta >= effMinDistanceBuckets && prevFast1 >= effMinRise && ratio >= 1 + ratioMin && prev1 >= effNoveltyMin) {
						const s = bucketStart(posBucket);
						if (s > (count > 0 ? points[count - 1] ?? 0 : -1)) {
							points[count++] = s;
							lastPeakBucket = posBucket;
							armed = false;
							cooldown = cooldownFrames;
							mg = Math.min(1, mg + .75);
						}
					}
				}
			}
			prev2 = prev1;
			prev1 = novelty;
			prevFast1 = fast;
			prevSlow1 = slow;
		}
		if (count <= 0) {
			points[0] = 0;
			return {
				points,
				count: 1
			};
		}
		return {
			points,
			count
		};
	}
	var SampleManager = class {
		samples = /* @__PURE__ */ new Map();
		sampleVersion = /* @__PURE__ */ new Map();
		sliceCache = /* @__PURE__ */ new Map();
		freesoundIds = /* @__PURE__ */ new Map();
		recordRequests = /* @__PURE__ */ new Map();
		nextHandle = 1;
		getSampleVersion(handle) {
			return this.sampleVersion.get(handle) ?? 0;
		}
		bumpVersion(handle) {
			this.sampleVersion.set(handle, (this.sampleVersion.get(handle) ?? 0) + 1);
		}
		registerFreesound(id) {
			for (const [handle$1, fsId] of this.freesoundIds.entries()) if (fsId === id) return handle$1;
			const handle = this.nextHandle++;
			this.freesoundIds.set(handle, id);
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
			return handle;
		}
		ensureFreesoundHandle(handle, freesoundId) {
			if (this.samples.has(handle)) return;
			this.freesoundIds.set(handle, freesoundId);
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
		}
		registerRecord(projectId, seconds, callbackId) {
			const key = `${projectId ?? ""}\0${seconds}\0${callbackId}`;
			for (const [handle$1, req] of this.recordRequests.entries()) if (`${req.projectId ?? ""}\0${req.seconds}\0${req.callbackId}` === key) return handle$1;
			const handle = this.nextHandle++;
			this.recordRequests.set(handle, {
				projectId,
				seconds,
				callbackId
			});
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
			return handle;
		}
		ensureRecordHandle(handle, seconds, callbackId) {
			if (this.samples.has(handle)) return;
			this.recordRequests.set(handle, {
				projectId: null,
				seconds,
				callbackId
			});
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
		}
		getFreesoundId(handle) {
			return this.freesoundIds.get(handle);
		}
		ensureInlineHandle(handle) {
			if (this.samples.has(handle)) return;
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
		}
		registerEspeak() {
			const handle = this.nextHandle++;
			this.samples.set(handle, {
				id: handle,
				channels: [],
				length: 0,
				sampleRate: 44100,
				ready: false
			});
			return handle;
		}
		registerInlineSample(channels, sampleRate$1) {
			const handle = this.nextHandle++;
			const copiedChannels = channels.map((ch) => new Float32Array(ch));
			this.samples.set(handle, {
				id: handle,
				channels: copiedChannels,
				length: copiedChannels[0]?.length ?? 0,
				sampleRate: sampleRate$1,
				ready: copiedChannels.length > 0 && (copiedChannels[0]?.length ?? 0) > 0
			});
			this.bumpVersion(handle);
			return handle;
		}
		getRecordRequest(handle) {
			return this.recordRequests.get(handle);
		}
		setSampleData(handle, channels, sampleRate$1) {
			const sample = this.samples.get(handle);
			if (!sample) return;
			sample.channels = channels;
			sample.length = channels[0]?.length ?? 0;
			sample.sampleRate = sampleRate$1;
			sample.ready = channels.length > 0 && sample.length > 0;
			sample.error = void 0;
			this.bumpVersion(handle);
		}
		setSampleError(handle, error) {
			const sample = this.samples.get(handle);
			if (!sample) return;
			sample.error = error;
			sample.ready = false;
			this.bumpVersion(handle);
		}
		recordSample(handle, audioData, sampleRate$1) {
			const sample = this.samples.get(handle);
			if (!sample) return;
			sample.channels = audioData.map((ch) => new Float32Array(ch));
			sample.length = audioData[0]?.length ?? 0;
			sample.sampleRate = sampleRate$1;
			sample.ready = sample.channels.length > 0 && sample.length > 0;
			this.bumpVersion(handle);
		}
		getSample(handle) {
			return this.samples.get(handle) ?? null;
		}
		getSlices(handle, threshold) {
			const sample = this.samples.get(handle);
			if (!sample || !sample.ready || sample.channels.length === 0) return {
				points: new Int32Array(1),
				count: 1
			};
			let cacheMap = this.sliceCache.get(handle);
			if (!cacheMap) {
				cacheMap = /* @__PURE__ */ new Map();
				this.sliceCache.set(handle, cacheMap);
			}
			const thresholdKey = Math.round(threshold * 1e3);
			let cached = cacheMap.get(thresholdKey);
			if (cached) return {
				points: cached.points,
				count: cached.count
			};
			const result = detectSlices(sample.channels[0], threshold, 256);
			cached = {
				threshold,
				points: result.points,
				count: result.count
			};
			cacheMap.set(thresholdKey, cached);
			return {
				points: result.points,
				count: result.count
			};
		}
		readChunk(handle, channel, offset, length) {
			const sample = this.samples.get(handle);
			if (!sample || !sample.ready) return new Float32Array(length);
			const ch = sample.channels[channel];
			if (!ch) return new Float32Array(length);
			const start = Math.max(0, Math.min(offset | 0, ch.length));
			const end = Math.max(start, Math.min(start + length, ch.length));
			if (end - start === 0) return new Float32Array(length);
			const result = new Float32Array(length);
			result.set(ch.subarray(start, end));
			return result;
		}
		areAllSamplesReady() {
			for (const sample of this.samples.values()) if (!sample.ready) return false;
			return true;
		}
		getRequiredSamples() {
			return Array.from(this.samples.keys()).filter((handle) => {
				const sample = this.samples.get(handle);
				return sample && !sample.ready;
			});
		}
		getSampleMemoryInfo() {
			let totalChannelBytes = 0;
			for (const sample of this.samples.values()) for (const ch of sample.channels) totalChannelBytes += ch.byteLength;
			return {
				handleCount: this.samples.size,
				totalChannelBytes
			};
		}
		clear() {
			this.samples.clear();
			this.sampleVersion.clear();
			this.sliceCache.clear();
			this.freesoundIds.clear();
			this.recordRequests.clear();
			this.nextHandle = 1;
		}
		clearHandle(handle) {
			const sample = this.samples.get(handle);
			if (sample) {
				sample.channels = [];
				sample.length = 0;
				sample.ready = false;
				sample.error = void 0;
			}
			this.bumpVersion(handle);
			this.sliceCache.delete(handle);
		}
	};
	const sampleManager = new SampleManager();
	function createWasmImports(memory) {
		return {
			debug: { debugAudioVmOp: (pc, op = -1, stackTop) => {} },
			sample: {
				readSampleChunk: (sampleHandle, channel, startSample, length, destPtr) => {
					const sample = sampleManager.getSample(sampleHandle);
					if (!sample || !sample.ready) {
						const chunk$1 = new Float32Array(length);
						new Float32Array(memory.buffer, destPtr, length).set(chunk$1);
						return;
					}
					const chunk = sampleManager.readChunk(sampleHandle, channel, startSample, length);
					new Float32Array(memory.buffer, destPtr, length).set(chunk);
				},
				getSampleLength: (sampleHandle, channel) => {
					const sample = sampleManager.getSample(sampleHandle);
					return !sample || !sample.ready ? 0 : sample.channels[channel] ? sample.channels[channel].length : 0;
				},
				getSampleChannelCount: (sampleHandle) => {
					const sample = sampleManager.getSample(sampleHandle);
					if (!sample || !sample.ready) return 0;
					return sample.channels.length;
				},
				getSliceCount: (sampleHandle, threshold) => {
					return sampleManager.getSlices(sampleHandle, threshold).count;
				},
				getSlicePoint: (sampleHandle, threshold, index) => {
					const result = sampleManager.getSlices(sampleHandle, threshold);
					if (index < 0 || index >= result.count) return 0;
					return result.points[index] ?? 0;
				},
				getSampleVersion: (sampleHandle) => sampleManager.getSampleVersion(sampleHandle)
			}
		};
	}
	function createAudioVm(runtime, vmId, controlOpsCapacity) {
		const localControlOpsPtr0 = runtime.createFloat32Buffer(controlOpsCapacity);
		const localControlOpsPtr1 = runtime.createFloat32Buffer(controlOpsCapacity);
		return {
			id: vmId,
			localControlOpsPtr0,
			localControlOpsPtr1,
			controlOpsCapacity,
			get infoPtr() {
				return runtime.getAudioVmInfoPtr(vmId);
			},
			reset() {
				runtime.resetAudioVmAt(vmId);
			},
			dispose() {
				runtime.freeFloat32Buffer(localControlOpsPtr0);
				runtime.freeFloat32Buffer(localControlOpsPtr1);
			}
		};
	}
	function createWasmRuntime(core) {
		const { wasm, memory } = core;
		return {
			get memory() {
				return memory;
			},
			get buffer() {
				return memory.buffer;
			},
			createFloat32Buffer(capacity) {
				return wasm.createFloat32Buffer(capacity);
			},
			freeFloat32Buffer(ptr) {
				wasm.freeFloat32Buffer(ptr >>> 0);
			},
			copyAudioVmState(fromVmId, toVmId) {
				wasm.copyAudioVmState(fromVmId, toVmId);
			},
			getAudioVmInfoPtr(vmId) {
				return wasm.getAudioVmInfoAt(vmId);
			},
			generateMiniHistoryWindow(bytecodePtr, historyPtr, windowStartSample, windowEndSample, bpm, sampleRate$1, barValue) {
				wasm.generateMiniHistoryWindow(bytecodePtr, historyPtr, windowStartSample, windowEndSample, bpm, sampleRate$1, barValue);
			},
			runAudioVmAt(vmId, audioOpsPtr, controlOpsLength, bufferLength, sampleCount, sampleRate$1, nyquist, piOverNyquist, bpm) {
				wasm.runAudioVmAt(vmId, audioOpsPtr, controlOpsLength, bufferLength, sampleCount, sampleRate$1, nyquist, piOverNyquist, bpm);
			},
			resetAudioVmAt(vmId) {
				wasm.resetAudioVmAt(vmId);
			},
			gc() {
				wasm.__collect();
			},
			memoryGrow(delta) {
				return wasm.memoryGrow(delta);
			},
			memoryUsage() {
				return wasm.memoryUsage();
			},
			setBpmOverride(bpm) {
				wasm.bpmOverride(bpm);
			}
		};
	}
	const section = "sourceMappingURL";
	function read_uint(buf, pos = 0) {
		let n = 0;
		let shift = 0;
		let b = buf[pos];
		let outpos = pos + 1;
		while (b >= 128) {
			n = n | b - 128 << shift;
			b = buf[outpos];
			outpos++;
			shift += 7;
		}
		return [n + (b << shift), outpos];
	}
	function encode_uint(n) {
		let result = [];
		while (n > 127) {
			result.push(128 | n & 127);
			n = n >> 7;
		}
		result.push(n);
		return new Uint8Array(result);
	}
	function ab2str(buf) {
		let str = "";
		let bytes = new Uint8Array(buf);
		for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
		return str;
	}
	function str2ab(str) {
		let bytes = new Uint8Array(str.length);
		for (let i = 0; i < str.length; i++) bytes[i] = str[i].charCodeAt(0);
		return bytes;
	}
	function writeSection(name, value) {
		const nameBuf = str2ab(name);
		const valBuf = str2ab(value);
		const nameLen = encode_uint(nameBuf.length);
		const valLen = encode_uint(valBuf.length);
		const sectionLen = nameLen.length + nameBuf.length + valLen.length + valBuf.length;
		const headerLen = encode_uint(sectionLen);
		let bytes = new Uint8Array(sectionLen + headerLen.length + 1);
		let pos = 1;
		bytes.set(headerLen, pos);
		pos += headerLen.length;
		bytes.set(nameLen, pos);
		pos += nameLen.length;
		bytes.set(nameBuf, pos);
		pos += nameBuf.length;
		bytes.set(valLen, pos);
		pos += valLen.length;
		bytes.set(valBuf, pos);
		return bytes;
	}
	function findSection(buf, id) {
		let pos = 8;
		while (pos < buf.byteLength) {
			const sec_start = pos;
			const [sec_id, pos2] = read_uint(buf, pos);
			const [sec_size, body_pos] = read_uint(buf, pos2);
			pos = body_pos + sec_size;
			if (sec_id == 0) {
				const [name_len, name_pos] = read_uint(buf, body_pos);
				if (ab2str(buf.slice(name_pos, name_pos + name_len)) == id) return [
					sec_start,
					sec_size + 1 + (body_pos - pos2),
					name_pos + name_len
				];
			}
		}
		return [
			-1,
			null,
			null
		];
	}
	const wasmSourceMap = {
		getSourceMapURL: function(buf) {
			buf = new Uint8Array(buf);
			const [sec_start, _, uri_start] = findSection(buf, section);
			if (sec_start == -1) return null;
			const [uri_len, uri_pos] = read_uint(buf, uri_start);
			return ab2str(buf.slice(uri_pos, uri_pos + uri_len));
		},
		removeSourceMapURL: function(buf) {
			buf = new Uint8Array(buf);
			const [sec_start, sec_size, _] = findSection(buf, section);
			if (sec_start == -1) return buf;
			let strippedBuf = new Uint8Array(buf.length - sec_size);
			strippedBuf.set(buf.slice(0, sec_start));
			strippedBuf.set(buf.slice(sec_start + sec_size), sec_start);
			return strippedBuf;
		},
		setSourceMapURL: function(buf, url) {
			const stripped = this.removeSourceMapURL(buf);
			const newSection = writeSection(section, url);
			const outBuf = new Uint8Array(stripped.length + newSection.length);
			outBuf.set(stripped);
			outBuf.set(newSection, stripped.length);
			return outBuf;
		}
	};
	function liftString(memory, pointer) {
		if (!pointer) return "";
		const end = pointer + new Uint32Array(memory.buffer)[pointer - 4 >>> 2] >>> 1, memoryU16 = new Uint16Array(memory.buffer);
		let start = pointer >>> 1, string = "";
		while (end - start > 1024) string += String.fromCharCode(...memoryU16.subarray(start, start += 1024));
		return string + String.fromCharCode(...memoryU16.subarray(start, end));
	}
	async function wasmSetup({ binary, sourcemapUrl, config, imports }) {
		const buffer = wasmSourceMap.setSourceMapURL(binary, sourcemapUrl);
		const uint8 = new Uint8Array(buffer);
		const memory = new WebAssembly.Memory({
			initial: config.options.initialMemory,
			maximum: config.options.maximumMemory,
			shared: config.options.sharedMemory
		});
		const mod = await WebAssembly.compile(uint8.buffer);
		const extraImports = typeof imports === "function" ? imports({ memory }) : imports;
		const importObject = { env: {
			memory,
			abort(message$, fileName$, lineNumber$, columnNumber$) {
				const message = liftString(memory, message$ >>> 0);
				const fileName = liftString(memory, fileName$ >>> 0);
				const lineNumber = lineNumber$ >>> 0;
				const columnNumber = columnNumber$ >>> 0;
				throw new Error(`${message} in ${fileName}:${lineNumber}:${columnNumber}`);
			},
			seed: () => Date.now() * Math.random(),
			log: console.log,
			warn: console.warn,
			"console.log": (textPtr) => {
				console.log(liftString(memory, textPtr));
			},
			"console.warn": (textPtr) => {
				console.warn(liftString(memory, textPtr));
			}
		} };
		if (extraImports) for (const k of Object.keys(extraImports)) {
			const mod$1 = extraImports[k];
			if (!mod$1) continue;
			importObject[k] = {
				...importObject[k],
				...mod$1
			};
		}
		return {
			wasm: (await WebAssembly.instantiate(mod, importObject)).exports,
			memory
		};
	}
	const AUDIO_VM_INFO_STRIDE = 29;
	const HISTORY_META_STRIDE = 20;
	let AudioVmOp = /* @__PURE__ */ function(AudioVmOp$1) {
		AudioVmOp$1[AudioVmOp$1["Out"] = 0] = "Out";
		AudioVmOp$1[AudioVmOp$1["Solo"] = 1] = "Solo";
		AudioVmOp$1[AudioVmOp$1["Post"] = 2] = "Post";
		AudioVmOp$1[AudioVmOp$1["PushScalar"] = 3] = "PushScalar";
		AudioVmOp$1[AudioVmOp$1["PushAudio"] = 4] = "PushAudio";
		AudioVmOp$1[AudioVmOp$1["PushUndefined"] = 5] = "PushUndefined";
		AudioVmOp$1[AudioVmOp$1["SetBpm"] = 6] = "SetBpm";
		AudioVmOp$1[AudioVmOp$1["Time"] = 7] = "Time";
		AudioVmOp$1[AudioVmOp$1["TableLookup"] = 8] = "TableLookup";
		AudioVmOp$1[AudioVmOp$1["Alloc"] = 9] = "Alloc";
		AudioVmOp$1[AudioVmOp$1["Write"] = 10] = "Write";
		AudioVmOp$1[AudioVmOp$1["Read"] = 11] = "Read";
		AudioVmOp$1[AudioVmOp$1["Tram"] = 12] = "Tram";
		AudioVmOp$1[AudioVmOp$1["Mini"] = 13] = "Mini";
		AudioVmOp$1[AudioVmOp$1["Timeline"] = 14] = "Timeline";
		AudioVmOp$1[AudioVmOp$1["Oversample"] = 15] = "Oversample";
		AudioVmOp$1[AudioVmOp$1["MakeArray"] = 16] = "MakeArray";
		AudioVmOp$1[AudioVmOp$1["ArrayGet"] = 17] = "ArrayGet";
		AudioVmOp$1[AudioVmOp$1["ArraySet"] = 18] = "ArraySet";
		AudioVmOp$1[AudioVmOp$1["ArrayLen"] = 19] = "ArrayLen";
		AudioVmOp$1[AudioVmOp$1["ArrayPush"] = 20] = "ArrayPush";
		AudioVmOp$1[AudioVmOp$1["Walk"] = 21] = "Walk";
		AudioVmOp$1[AudioVmOp$1["Glide"] = 22] = "Glide";
		AudioVmOp$1[AudioVmOp$1["Step"] = 23] = "Step";
		AudioVmOp$1[AudioVmOp$1["Random"] = 24] = "Random";
		AudioVmOp$1[AudioVmOp$1["GetSystem"] = 25] = "GetSystem";
		AudioVmOp$1[AudioVmOp$1["GetGlobal"] = 26] = "GetGlobal";
		AudioVmOp$1[AudioVmOp$1["GetLocal"] = 27] = "GetLocal";
		AudioVmOp$1[AudioVmOp$1["SetGlobal"] = 28] = "SetGlobal";
		AudioVmOp$1[AudioVmOp$1["SetLocal"] = 29] = "SetLocal";
		AudioVmOp$1[AudioVmOp$1["GetClosure"] = 30] = "GetClosure";
		AudioVmOp$1[AudioVmOp$1["SetClosure"] = 31] = "SetClosure";
		AudioVmOp$1[AudioVmOp$1["GetCellRefLocal"] = 32] = "GetCellRefLocal";
		AudioVmOp$1[AudioVmOp$1["GetCellRefGlobal"] = 33] = "GetCellRefGlobal";
		AudioVmOp$1[AudioVmOp$1["GetCellRefClosure"] = 34] = "GetCellRefClosure";
		AudioVmOp$1[AudioVmOp$1["DefineFunction"] = 35] = "DefineFunction";
		AudioVmOp$1[AudioVmOp$1["CallFunction"] = 36] = "CallFunction";
		AudioVmOp$1[AudioVmOp$1["Return"] = 37] = "Return";
		AudioVmOp$1[AudioVmOp$1["Throw"] = 38] = "Throw";
		AudioVmOp$1[AudioVmOp$1["PushTryBlock"] = 39] = "PushTryBlock";
		AudioVmOp$1[AudioVmOp$1["PopTryBlock"] = 40] = "PopTryBlock";
		AudioVmOp$1[AudioVmOp$1["Jump"] = 41] = "Jump";
		AudioVmOp$1[AudioVmOp$1["JumpIfFalse"] = 42] = "JumpIfFalse";
		AudioVmOp$1[AudioVmOp$1["JumpIfTrue"] = 43] = "JumpIfTrue";
		AudioVmOp$1[AudioVmOp$1["PushClosure"] = 44] = "PushClosure";
		AudioVmOp$1[AudioVmOp$1["PopScope"] = 45] = "PopScope";
		AudioVmOp$1[AudioVmOp$1["Dup"] = 46] = "Dup";
		AudioVmOp$1[AudioVmOp$1["Pop"] = 47] = "Pop";
		AudioVmOp$1[AudioVmOp$1["Neg"] = 48] = "Neg";
		AudioVmOp$1[AudioVmOp$1["Not"] = 49] = "Not";
		AudioVmOp$1[AudioVmOp$1["BitNot"] = 50] = "BitNot";
		AudioVmOp$1[AudioVmOp$1["Add"] = 51] = "Add";
		AudioVmOp$1[AudioVmOp$1["Sub"] = 52] = "Sub";
		AudioVmOp$1[AudioVmOp$1["Mul"] = 53] = "Mul";
		AudioVmOp$1[AudioVmOp$1["Div"] = 54] = "Div";
		AudioVmOp$1[AudioVmOp$1["Mod"] = 55] = "Mod";
		AudioVmOp$1[AudioVmOp$1["Pow"] = 56] = "Pow";
		AudioVmOp$1[AudioVmOp$1["Greater"] = 57] = "Greater";
		AudioVmOp$1[AudioVmOp$1["Less"] = 58] = "Less";
		AudioVmOp$1[AudioVmOp$1["GreaterEqual"] = 59] = "GreaterEqual";
		AudioVmOp$1[AudioVmOp$1["LessEqual"] = 60] = "LessEqual";
		AudioVmOp$1[AudioVmOp$1["Equal"] = 61] = "Equal";
		AudioVmOp$1[AudioVmOp$1["NotEqual"] = 62] = "NotEqual";
		AudioVmOp$1[AudioVmOp$1["And"] = 63] = "And";
		AudioVmOp$1[AudioVmOp$1["Or"] = 64] = "Or";
		AudioVmOp$1[AudioVmOp$1["BitAnd"] = 65] = "BitAnd";
		AudioVmOp$1[AudioVmOp$1["BitOr"] = 66] = "BitOr";
		AudioVmOp$1[AudioVmOp$1["BitXor"] = 67] = "BitXor";
		AudioVmOp$1[AudioVmOp$1["ShiftLeft"] = 68] = "ShiftLeft";
		AudioVmOp$1[AudioVmOp$1["ShiftRight"] = 69] = "ShiftRight";
		AudioVmOp$1[AudioVmOp$1["IsUndefined"] = 70] = "IsUndefined";
		AudioVmOp$1[AudioVmOp$1["IsScalar"] = 71] = "IsScalar";
		AudioVmOp$1[AudioVmOp$1["IsAudio"] = 72] = "IsAudio";
		AudioVmOp$1[AudioVmOp$1["IsArray"] = 73] = "IsArray";
		AudioVmOp$1[AudioVmOp$1["IsFunction"] = 74] = "IsFunction";
		AudioVmOp$1[AudioVmOp$1["MathUnary"] = 75] = "MathUnary";
		AudioVmOp$1[AudioVmOp$1["MathBinary"] = 76] = "MathBinary";
		AudioVmOp$1[AudioVmOp$1["MathTernary"] = 77] = "MathTernary";
		AudioVmOp$1[AudioVmOp$1["GenPhasor_default"] = 78] = "GenPhasor_default";
		AudioVmOp$1[AudioVmOp$1["GenEvery_default"] = 79] = "GenEvery_default";
		AudioVmOp$1[AudioVmOp$1["GenWhite_default"] = 80] = "GenWhite_default";
		AudioVmOp$1[AudioVmOp$1["GenLfosqr_default"] = 81] = "GenLfosqr_default";
		AudioVmOp$1[AudioVmOp$1["GenLfosah_default"] = 82] = "GenLfosah_default";
		AudioVmOp$1[AudioVmOp$1["GenDc_default"] = 83] = "GenDc_default";
		AudioVmOp$1[AudioVmOp$1["GenGauss_default"] = 84] = "GenGauss_default";
		AudioVmOp$1[AudioVmOp$1["GenImpulse_default"] = 85] = "GenImpulse_default";
		AudioVmOp$1[AudioVmOp$1["GenTestGain_default"] = 86] = "GenTestGain_default";
		AudioVmOp$1[AudioVmOp$1["GenFreeverb_default"] = 87] = "GenFreeverb_default";
		AudioVmOp$1[AudioVmOp$1["GenSaw_default"] = 88] = "GenSaw_default";
		AudioVmOp$1[AudioVmOp$1["GenTestOversample_default"] = 89] = "GenTestOversample_default";
		AudioVmOp$1[AudioVmOp$1["GenSine_default"] = 90] = "GenSine_default";
		AudioVmOp$1[AudioVmOp$1["GenLfosine_default"] = 91] = "GenLfosine_default";
		AudioVmOp$1[AudioVmOp$1["GenSlicer_default"] = 92] = "GenSlicer_default";
		AudioVmOp$1[AudioVmOp$1["GenBrown_default"] = 93] = "GenBrown_default";
		AudioVmOp$1[AudioVmOp$1["GenEuclid_default"] = 94] = "GenEuclid_default";
		AudioVmOp$1[AudioVmOp$1["GenPwm_default"] = 95] = "GenPwm_default";
		AudioVmOp$1[AudioVmOp$1["GenAd_default"] = 96] = "GenAd_default";
		AudioVmOp$1[AudioVmOp$1["GenOnepole_lp1"] = 97] = "GenOnepole_lp1";
		AudioVmOp$1[AudioVmOp$1["GenOnepole_hp1"] = 98] = "GenOnepole_hp1";
		AudioVmOp$1[AudioVmOp$1["GenSqr_default"] = 99] = "GenSqr_default";
		AudioVmOp$1[AudioVmOp$1["GenHold_default"] = 100] = "GenHold_default";
		AudioVmOp$1[AudioVmOp$1["GenLfosaw_default"] = 101] = "GenLfosaw_default";
		AudioVmOp$1[AudioVmOp$1["GenCompressor_default"] = 102] = "GenCompressor_default";
		AudioVmOp$1[AudioVmOp$1["GenEmit_default"] = 103] = "GenEmit_default";
		AudioVmOp$1[AudioVmOp$1["GenFractal_default"] = 104] = "GenFractal_default";
		AudioVmOp$1[AudioVmOp$1["GenLforamp_default"] = 105] = "GenLforamp_default";
		AudioVmOp$1[AudioVmOp$1["GenTri_default"] = 106] = "GenTri_default";
		AudioVmOp$1[AudioVmOp$1["GenPitchshift_default"] = 107] = "GenPitchshift_default";
		AudioVmOp$1[AudioVmOp$1["GenZerox_default"] = 108] = "GenZerox_default";
		AudioVmOp$1[AudioVmOp$1["GenLimiter_default"] = 109] = "GenLimiter_default";
		AudioVmOp$1[AudioVmOp$1["GenAt_default"] = 110] = "GenAt_default";
		AudioVmOp$1[AudioVmOp$1["GenDiodeladder_default"] = 111] = "GenDiodeladder_default";
		AudioVmOp$1[AudioVmOp$1["GenRamp_default"] = 112] = "GenRamp_default";
		AudioVmOp$1[AudioVmOp$1["GenSmooth_default"] = 113] = "GenSmooth_default";
		AudioVmOp$1[AudioVmOp$1["GenLfotri_default"] = 114] = "GenLfotri_default";
		AudioVmOp$1[AudioVmOp$1["GenAdsr_default"] = 115] = "GenAdsr_default";
		AudioVmOp$1[AudioVmOp$1["GenAnalyser_default"] = 116] = "GenAnalyser_default";
		AudioVmOp$1[AudioVmOp$1["GenBiquad_lp"] = 117] = "GenBiquad_lp";
		AudioVmOp$1[AudioVmOp$1["GenBiquad_hp"] = 118] = "GenBiquad_hp";
		AudioVmOp$1[AudioVmOp$1["GenBiquad_bp"] = 119] = "GenBiquad_bp";
		AudioVmOp$1[AudioVmOp$1["GenBiquad_bs"] = 120] = "GenBiquad_bs";
		AudioVmOp$1[AudioVmOp$1["GenBiquad_ap"] = 121] = "GenBiquad_ap";
		AudioVmOp$1[AudioVmOp$1["GenEnvfollow_default"] = 122] = "GenEnvfollow_default";
		AudioVmOp$1[AudioVmOp$1["GenSah_default"] = 123] = "GenSah_default";
		AudioVmOp$1[AudioVmOp$1["GenVelvet_default"] = 124] = "GenVelvet_default";
		AudioVmOp$1[AudioVmOp$1["GenFdn_default"] = 125] = "GenFdn_default";
		AudioVmOp$1[AudioVmOp$1["GenPink_default"] = 126] = "GenPink_default";
		AudioVmOp$1[AudioVmOp$1["GenDattorro_default"] = 127] = "GenDattorro_default";
		AudioVmOp$1[AudioVmOp$1["GenRandom_default"] = 128] = "GenRandom_default";
		AudioVmOp$1[AudioVmOp$1["GenSlew_default"] = 129] = "GenSlew_default";
		AudioVmOp$1[AudioVmOp$1["GenInc_default"] = 130] = "GenInc_default";
		AudioVmOp$1[AudioVmOp$1["GenBiquadshelf_ls"] = 131] = "GenBiquadshelf_ls";
		AudioVmOp$1[AudioVmOp$1["GenBiquadshelf_hs"] = 132] = "GenBiquadshelf_hs";
		AudioVmOp$1[AudioVmOp$1["GenBiquadshelf_peak"] = 133] = "GenBiquadshelf_peak";
		AudioVmOp$1[AudioVmOp$1["GenSampler_default"] = 134] = "GenSampler_default";
		AudioVmOp$1[AudioVmOp$1["GenMoog_lpm"] = 135] = "GenMoog_lpm";
		AudioVmOp$1[AudioVmOp$1["GenMoog_hpm"] = 136] = "GenMoog_hpm";
		AudioVmOp$1[AudioVmOp$1["GenSvf_lps"] = 137] = "GenSvf_lps";
		AudioVmOp$1[AudioVmOp$1["GenSvf_hps"] = 138] = "GenSvf_hps";
		AudioVmOp$1[AudioVmOp$1["GenSvf_bps"] = 139] = "GenSvf_bps";
		AudioVmOp$1[AudioVmOp$1["GenSvf_bss"] = 140] = "GenSvf_bss";
		AudioVmOp$1[AudioVmOp$1["GenSvf_peaks"] = 141] = "GenSvf_peaks";
		AudioVmOp$1[AudioVmOp$1["GenSvf_aps"] = 142] = "GenSvf_aps";
		return AudioVmOp$1;
	}({});
	const OPCODE_INFO = {
		[AudioVmOp.PushScalar]: { kind: "param" },
		[AudioVmOp.PushAudio]: { kind: "param" },
		[AudioVmOp.SetBpm]: { kind: "param" },
		[AudioVmOp.GetSystem]: { kind: "param" },
		[AudioVmOp.GetGlobal]: { kind: "param" },
		[AudioVmOp.SetGlobal]: { kind: "param" },
		[AudioVmOp.GetLocal]: { kind: "param" },
		[AudioVmOp.SetLocal]: { kind: "param" },
		[AudioVmOp.GetClosure]: { kind: "param" },
		[AudioVmOp.SetClosure]: { kind: "param" },
		[AudioVmOp.GetCellRefLocal]: { kind: "param" },
		[AudioVmOp.GetCellRefGlobal]: { kind: "param" },
		[AudioVmOp.GetCellRefClosure]: { kind: "param" },
		[AudioVmOp.PushClosure]: { kind: "param" },
		[AudioVmOp.CallFunction]: { kind: "param" },
		[AudioVmOp.ArrayPush]: { kind: "param" },
		[AudioVmOp.MakeArray]: { kind: "param" },
		[AudioVmOp.ArrayGet]: { kind: "param" },
		[AudioVmOp.Out]: { kind: "param" },
		[AudioVmOp.Solo]: { kind: "param" },
		[AudioVmOp.MathUnary]: { kind: "param" },
		[AudioVmOp.MathBinary]: { kind: "param" },
		[AudioVmOp.MathTernary]: { kind: "param" },
		[AudioVmOp.Jump]: { kind: "pc-param" },
		[AudioVmOp.JumpIfFalse]: { kind: "pc-param" },
		[AudioVmOp.JumpIfTrue]: { kind: "pc-param" },
		[AudioVmOp.PushTryBlock]: { kind: "three-param" },
		[AudioVmOp.TableLookup]: { kind: "table" },
		[AudioVmOp.Alloc]: { kind: "param" },
		[AudioVmOp.Step]: { kind: "param" },
		[AudioVmOp.Random]: { kind: "param" },
		[AudioVmOp.Write]: { kind: "none" },
		[AudioVmOp.Tram]: { kind: "table" },
		[AudioVmOp.Mini]: { kind: "table" },
		[AudioVmOp.Timeline]: { kind: "table" },
		[AudioVmOp.DefineFunction]: { kind: "define-function" }
	};
	function getOpcodeInfo(op) {
		return OPCODE_INFO[op] ?? { kind: "none" };
	}
	function isOpcodeOneParam(op) {
		const { kind } = getOpcodeInfo(op);
		return kind === "param" || kind === "pc-param";
	}
	const CONTROL_OPS_CAPACITY = 16384;
	const HISTORY_META_SHARED_HEADER = 2;
	(HISTORY_META_SHARED_HEADER + 512 * HISTORY_META_STRIDE) * 4;
	let DspProgramState = /* @__PURE__ */ function(DspProgramState$1) {
		DspProgramState$1[DspProgramState$1["Stop"] = 0] = "Stop";
		DspProgramState$1[DspProgramState$1["Start"] = 1] = "Start";
		DspProgramState$1[DspProgramState$1["Pause"] = 2] = "Pause";
		return DspProgramState$1;
	}({});
	const SHARED_PROGRAM_STATE_SLOTS = 5;
	const SHARED_PROGRAM_STATE_BYTE_LENGTH = SHARED_PROGRAM_STATE_SLOTS * 4;
	let SharedProgramStateIndex = /* @__PURE__ */ function(SharedProgramStateIndex$1) {
		SharedProgramStateIndex$1[SharedProgramStateIndex$1["HistoryPackIndex"] = 0] = "HistoryPackIndex";
		SharedProgramStateIndex$1[SharedProgramStateIndex$1["HistoryPackEpoch"] = 1] = "HistoryPackEpoch";
		SharedProgramStateIndex$1[SharedProgramStateIndex$1["Bpm"] = 2] = "Bpm";
		SharedProgramStateIndex$1[SharedProgramStateIndex$1["State"] = 3] = "State";
		SharedProgramStateIndex$1[SharedProgramStateIndex$1["SampleCount"] = 4] = "SampleCount";
		return SharedProgramStateIndex$1;
	}({});
	function createSharedProgramStateViewsFromBuffer(buffer, byteOffset = 0) {
		return {
			u32: new Uint32Array(buffer, byteOffset, SHARED_PROGRAM_STATE_SLOTS),
			f32: new Float32Array(buffer, byteOffset, SHARED_PROGRAM_STATE_SLOTS)
		};
	}
	let SharedTransportRunningState = /* @__PURE__ */ function(SharedTransportRunningState$1) {
		SharedTransportRunningState$1[SharedTransportRunningState$1["Stop"] = 0] = "Stop";
		SharedTransportRunningState$1[SharedTransportRunningState$1["Start"] = 1] = "Start";
		SharedTransportRunningState$1[SharedTransportRunningState$1["Pause"] = 2] = "Pause";
		return SharedTransportRunningState$1;
	}({});
	const SHARED_TRANSPORT_SLOTS = 9;
	SHARED_TRANSPORT_SLOTS * 4;
	let SharedTransportIndex = /* @__PURE__ */ function(SharedTransportIndex$1) {
		SharedTransportIndex$1[SharedTransportIndex$1["SampleCount"] = 0] = "SampleCount";
		SharedTransportIndex$1[SharedTransportIndex$1["Running"] = 1] = "Running";
		SharedTransportIndex$1[SharedTransportIndex$1["SeekVersion"] = 2] = "SeekVersion";
		SharedTransportIndex$1[SharedTransportIndex$1["StopAndSeekToZero"] = 3] = "StopAndSeekToZero";
		SharedTransportIndex$1[SharedTransportIndex$1["ActuallyPlaying"] = 4] = "ActuallyPlaying";
		SharedTransportIndex$1[SharedTransportIndex$1["HistorySyncRequested"] = 5] = "HistorySyncRequested";
		SharedTransportIndex$1[SharedTransportIndex$1["LoopBeginSamples"] = 6] = "LoopBeginSamples";
		SharedTransportIndex$1[SharedTransportIndex$1["LoopEndSamples"] = 7] = "LoopEndSamples";
		SharedTransportIndex$1[SharedTransportIndex$1["ProjectEndSamples"] = 8] = "ProjectEndSamples";
		return SharedTransportIndex$1;
	}({});
	function createSharedTransportViewsFromBuffer(buffer, byteOffset = 0) {
		return {
			u32: new Uint32Array(buffer, byteOffset, SHARED_TRANSPORT_SLOTS),
			f32: new Float32Array(buffer, byteOffset, SHARED_TRANSPORT_SLOTS)
		};
	}
	const PROGRAM_SWAP_FADE_SAMPLES = 1024;
	function createProgramRuntime(opts) {
		const stateU32 = opts.stateU32;
		const stateF32 = opts.stateF32;
		stateU32.fill(0);
		stateF32[SharedProgramStateIndex.Bpm] = opts.bpm;
		stateU32[SharedProgramStateIndex.State] = DspProgramState.Stop;
		const slots = [{
			vm: opts.vms[0],
			localControlOpsActive: 0,
			controlOpsLength: 0
		}, {
			vm: opts.vms[1],
			localControlOpsActive: 0,
			controlOpsLength: 0
		}];
		return {
			vmIds: opts.vmIds,
			slots,
			id: opts.id,
			activeSlot: 0,
			gain: 1,
			swapFadeRemaining: 0,
			swapFadeTotal: 0,
			swapFadeFrom: 0,
			swapFadeTo: 0,
			stateU32,
			stateF32,
			historyMetaBuffers: opts.historyMetaBuffers,
			seekSampleCount: 0,
			get state() {
				return stateU32[SharedProgramStateIndex.State] ?? DspProgramState.Stop;
			},
			set state(v) {
				stateU32[SharedProgramStateIndex.State] = v;
			},
			get sampleCount() {
				return Atomics.load(stateU32, SharedProgramStateIndex.SampleCount) >>> 0;
			},
			set sampleCount(v) {
				Atomics.store(stateU32, SharedProgramStateIndex.SampleCount, v >>> 0);
			},
			set bpm(v) {
				stateF32[SharedProgramStateIndex.Bpm] = v;
			},
			toSharedInit() {
				return {
					id: opts.id,
					vmIds: opts.vmIds,
					stateBuffer: stateU32.buffer,
					controlOpsCapacity: opts.vms[0].controlOpsCapacity,
					...opts.historyMetaBuffers !== void 0 && { historyMetaBuffers: opts.historyMetaBuffers }
				};
			},
			reset() {
				slots[0].vm.reset();
				slots[1].vm.reset();
			},
			dispose() {
				slots[0].vm.dispose();
				slots[1].vm.dispose();
			}
		};
	}
	function scanSetBpm(ops, length) {
		const u32 = new Uint32Array(ops.buffer, ops.byteOffset, ops.length);
		const f32 = ops;
		let pc = 0;
		let bpm = 0;
		while (pc < length) {
			const op = u32[pc] ?? 0;
			pc++;
			if (op === AudioVmOp.SetBpm) {
				bpm = f32[pc] ?? 0;
				pc++;
				continue;
			}
			if (isOpcodeOneParam(op)) pc++;
			else if (op === AudioVmOp.PushTryBlock) pc += 3;
			else if (op === AudioVmOp.TableLookup) {
				const tableLen = Math.round(f32[pc] ?? 0);
				pc += 1 + Math.max(0, tableLen);
			} else if (op === AudioVmOp.DefineFunction) {
				const bytecodeLength = Math.round(f32[pc + 5] ?? 0);
				pc += 6 + Math.max(0, bytecodeLength);
			}
		}
		return bpm;
	}
	function getProgramById(programsById, id) {
		return programsById.get(id) ?? null;
	}
	function clearProgramHistoryMeta(p) {
		if (!p.historyMetaBuffers) return;
		for (const buf of p.historyMetaBuffers) {
			const sharedU32 = new Uint32Array(buf);
			Atomics.store(sharedU32, 0, 1);
			sharedU32[1] = 0;
			Atomics.store(sharedU32, 0, 0);
		}
	}
	function setProgramsState(programsById, state, ids) {
		for (const id of ids) {
			const p = getProgramById(programsById, id);
			if (!p) throw new Error("Program not found with id: " + id);
			if (state === DspProgramState.Start) clearProgramHistoryMeta(p);
			p.state = state;
			if (state !== DspProgramState.Start) {
				p.swapFadeRemaining = 0;
				p.swapFadeTotal = 0;
			}
		}
	}
	function applyTransportSeek(state, newSampleCount) {
		state.transportSeekVersion = state.transportSeekVersion + 1;
		state.transportSampleCount = newSampleCount;
	}
	function applyProgramSeek(programsById, sampleCount, ids) {
		for (const id of ids) {
			const p = getProgramById(programsById, id);
			if (!p) throw new Error("Program not found with id: " + id);
			p.sampleCount = p.seekSampleCount = sampleCount;
		}
	}
	function copyHistoryMetaToProgramShared(runtime, p, vm, info) {
		if (!p.historyMetaBuffers) return;
		const view = info ?? new Uint32Array(runtime.buffer, vm.infoPtr, 10);
		const historyMetaPtr = view[5] ?? 0;
		const historyCount = view[6] ?? 0;
		if (historyCount <= 0 || historyMetaPtr <= 0) return;
		const nextIndex = Atomics.load(p.stateU32, SharedProgramStateIndex.HistoryPackIndex) >>> 0 ^ 1;
		const sharedU32 = new Uint32Array(p.historyMetaBuffers[nextIndex]);
		if (Atomics.compareExchange(sharedU32, 0, 0, 1) !== 0) return;
		sharedU32[1] = historyCount;
		const len = historyCount * HISTORY_META_STRIDE;
		const wasmMeta = new Uint32Array(runtime.buffer, historyMetaPtr, len);
		for (let i = 0; i < len; i++) sharedU32[HISTORY_META_SHARED_HEADER + i] = wasmMeta[i];
		Atomics.store(sharedU32, 0, 0);
		Atomics.store(p.stateU32, SharedProgramStateIndex.HistoryPackIndex, nextIndex);
		Atomics.add(p.stateU32, SharedProgramStateIndex.HistoryPackEpoch, 1);
	}
	function runProgram(runtime, nyquist, piOverNyquist, bpmOverrideValue, bpm, p, slot, bufferLength, sampleCount, outputL, outputR, gain, copyHistory) {
		const audioOpsPtr = slot.localControlOpsActive === 0 ? slot.vm.localControlOpsPtr0 : slot.vm.localControlOpsPtr1;
		runtime.runAudioVmAt(slot.vm.id, audioOpsPtr, slot.controlOpsLength, bufferLength, sampleCount, sampleRate, nyquist, piOverNyquist, bpmOverrideValue || bpm);
		const infoPtr = slot.vm.infoPtr;
		const info = new Uint32Array(runtime.buffer, infoPtr, 10);
		if (copyHistory) copyHistoryMetaToProgramShared(runtime, p, slot.vm, info);
		const outputLeftPtr = info[8] ?? 0;
		const outputRightPtr = info[9] ?? 0;
		if (!outputLeftPtr || !outputRightPtr) return;
		const audioL = new Float32Array(runtime.buffer, outputLeftPtr, bufferLength);
		const audioR = new Float32Array(runtime.buffer, outputRightPtr, bufferLength);
		for (let i = 0; i < bufferLength; i++) {
			outputL[i] = (outputL[i] ?? 0) + (audioL[i] ?? 0) * gain;
			outputR[i] = (outputR[i] ?? 0) + (audioR[i] ?? 0) * gain;
		}
	}
	async function createProcessorState(binary, opts) {
		const core = await wasmSetup({
			binary,
			config: opts.config,
			sourcemapUrl: opts.sourcemapUrl,
			imports: ({ memory }) => createWasmImports(memory)
		});
		let memoryBuffer = core.wasm.memory.buffer;
		const transportBuffer = opts.transportBuffer;
		const t = createSharedTransportViewsFromBuffer(transportBuffer);
		const transportU32 = t.u32;
		const transportF32 = t.f32;
		const programsByVmId = /* @__PURE__ */ new Map();
		const programsById = /* @__PURE__ */ new Map();
		const runtime = createWasmRuntime(core);
		const sampleCountRef = { value: 0 };
		const bpmRef = { value: 120 };
		const bpmOverrideValueRef = { value: 0 };
		const quantumRef = { value: 128 };
		const nyquist = sampleRate * .5;
		const piOverNyquist = Math.PI / nyquist;
		const PREVIEW_SEEK_CHUNKS = 32;
		let scheduleProgramsSeek = [];
		let scheduleProgramsSeekChunks = 0;
		const limiterThresholdDb = 0;
		const limiterReleaseSeconds = .1;
		const limiterL = {
			currentGain: 1,
			lastThreshold: Infinity,
			lastRelease: Infinity,
			lastSampleRate: Infinity,
			releaseCoeff: 0,
			thresholdLinear: 1
		};
		const limiterR = {
			currentGain: 1,
			lastThreshold: Infinity,
			lastRelease: Infinity,
			lastSampleRate: Infinity,
			releaseCoeff: 0,
			thresholdLinear: 1
		};
		let hadError = false;
		let wasPlaying = false;
		let isPlaying = false;
		let idsNowPlaying = /* @__PURE__ */ new Set();
		let idsWasPlaying = /* @__PURE__ */ new Set();
		function applyLimiter(buffer, state$1) {
			const thresholdClamped = Math.max(-80, Math.min(limiterThresholdDb, 0));
			const releaseClamped = Math.max(1e-4, Math.min(limiterReleaseSeconds, 5));
			const thresholdChanged = thresholdClamped !== state$1.lastThreshold;
			const releaseChanged = releaseClamped !== state$1.lastRelease;
			const sampleRateChanged = sampleRate !== state$1.lastSampleRate;
			if (thresholdChanged) {
				state$1.thresholdLinear = 10 ** (Math.max(-80, Math.min(thresholdClamped, 0)) / 20);
				state$1.lastThreshold = thresholdClamped;
			}
			if (releaseChanged) state$1.lastRelease = releaseClamped;
			if (releaseChanged || sampleRateChanged) {
				const rel = Math.max(1e-4, Math.min(releaseClamped, 5));
				state$1.releaseCoeff = Math.exp(-3 / (rel * sampleRate));
				state$1.lastSampleRate = sampleRate;
			}
			let currentGain = state$1.currentGain;
			const thresholdLinear = state$1.thresholdLinear;
			const releaseCoeff = state$1.releaseCoeff;
			const len = buffer.length;
			for (let i = 0; i < len; i++) {
				const input = buffer[i] ?? 0;
				const inputLevel = Math.abs(input);
				const targetGain = inputLevel > thresholdLinear ? thresholdLinear / inputLevel : 1;
				if (currentGain > targetGain) currentGain = targetGain + (currentGain - targetGain) * releaseCoeff;
				else currentGain = targetGain;
				currentGain = Math.max(0, Math.min(1, currentGain));
				let outSample = input * currentGain;
				if (Math.abs(outSample) > thresholdLinear) {
					outSample = thresholdLinear * Math.sign(outSample || 1);
					currentGain = targetGain;
				}
				buffer[i] = outSample;
			}
			state$1.currentGain = currentGain;
		}
		function processBuffer(outputs, dsp) {
			const bufferLength = outputs[0]?.[0]?.length ?? 0;
			const outputL = outputs[0]?.[0];
			const outputR = outputs[0]?.[1] ?? outputL;
			if (!outputL || !outputR || bufferLength <= 0) {
				wasPlaying = false;
				isPlaying = false;
				return true;
			}
			quantumRef.value = bufferLength;
			let scheduleRefresh = false;
			if (memoryBuffer !== core.wasm.memory.buffer) {
				memoryBuffer = core.wasm.memory.buffer;
				scheduleRefresh = true;
			}
			if (state.transportStopAndSeekToZero !== 0) {
				state.transportStopAndSeekToZero = 0;
				state.transportRunning = SharedTransportRunningState.Stop;
				state.transportActuallyPlaying = SharedTransportRunningState.Stop;
				applyTransportSeek(state, 0);
				setProgramsState(programsById, DspProgramState.Stop, state.scheduleStopAndSeekToZero);
				applyProgramSeek(programsById, 0, state.scheduleStopAndSeekToZero);
				state.scheduleStopAndSeekToZero = [];
				core.wasm.__collect();
				for (const p of programsById.values()) {
					const slot = p.slots[p.activeSlot];
					copyHistoryMetaToProgramShared(runtime, p, slot.vm);
				}
				wasPlaying = false;
				isPlaying = false;
				return true;
			}
			const seekVersion = state.transportSeekVersion;
			const next = Math.round(state.transportSampleCount);
			if (seekVersion !== state.transportSeekVersion) {
				state.transportSeekVersion = seekVersion;
				state.sampleCount = next;
				for (const p of programsById.values()) p.sampleCount = next;
			}
			if (!(state.transportRunning === SharedTransportRunningState.Start) && !scheduleProgramsSeekChunks) {
				state.transportActuallyPlaying = state.transportRunning;
				state.transportSampleCount = state.sampleCount;
				if (wasPlaying) for (const p of programsById.values()) {
					const slot = p.slots[p.activeSlot];
					copyHistoryMetaToProgramShared(runtime, p, slot.vm);
				}
				wasPlaying = false;
				isPlaying = false;
				return true;
			}
			state.transportActuallyPlaying = state.transportRunning;
			try {
				for (const p of programsById.values()) {
					const activeSlot = p.slots[p.activeSlot];
					if ((p.state !== DspProgramState.Start || activeSlot.controlOpsLength <= 0) && !scheduleProgramsSeek.includes(p.id)) {
						const slot = p.slots[p.activeSlot];
						copyHistoryMetaToProgramShared(runtime, p, slot.vm);
						const pending$1 = pendingProgramApplied.get(p.id);
						const pendingSlot$1 = pendingProgramAppliedSlot.get(p.id);
						if (pending$1 && pendingSlot$1 === p.activeSlot) {
							pendingProgramApplied.delete(p.id);
							pendingProgramAppliedSlot.delete(p.id);
							pending$1.resolve();
						}
						continue;
					}
					const advanceSampleCount = !scheduleProgramsSeekChunks;
					const baseSampleCount = advanceSampleCount ? p.sampleCount : p.seekSampleCount;
					if (p.swapFadeRemaining > 0) {
						const from = p.swapFadeFrom;
						const to = p.swapFadeTo;
						const remaining = p.swapFadeRemaining;
						const total = p.swapFadeTotal || 1;
						const t$1 = Math.min(1, Math.max(0, (total - remaining) / total));
						runProgram(runtime, nyquist, piOverNyquist, bpmOverrideValueRef.value, bpmRef.value, p, p.slots[from], bufferLength, baseSampleCount, outputL, outputR, (1 - t$1) * (p.gain || 0), false);
						runProgram(runtime, nyquist, piOverNyquist, bpmOverrideValueRef.value, bpmRef.value, p, p.slots[to], bufferLength, baseSampleCount, outputL, outputR, t$1 * (p.gain || 0), true);
						p.swapFadeRemaining = Math.max(0, p.swapFadeRemaining - bufferLength);
					} else runProgram(runtime, nyquist, piOverNyquist, bpmOverrideValueRef.value, bpmRef.value, p, p.slots[p.activeSlot], bufferLength, baseSampleCount, outputL, outputR, p.gain || 0, true);
					if (advanceSampleCount) {
						p.sampleCount = baseSampleCount + bufferLength;
						if (state.loopBeginSamples >= 0 && state.loopEndSamples > 0) {
							if (p.sampleCount >= state.loopEndSamples) p.sampleCount = state.loopBeginSamples + (p.sampleCount - state.loopEndSamples);
						}
						if (state.projectEndSamples > 0) {
							if (p.sampleCount >= state.projectEndSamples) p.sampleCount = 0 + (p.sampleCount - state.projectEndSamples);
						}
					} else p.seekSampleCount = baseSampleCount + bufferLength;
					const pending = pendingProgramApplied.get(p.id);
					const pendingSlot = pendingProgramAppliedSlot.get(p.id);
					if (pending && pendingSlot === p.activeSlot) {
						pendingProgramApplied.delete(p.id);
						pendingProgramAppliedSlot.delete(p.id);
						pending.resolve();
					}
					idsNowPlaying.add(p.id);
					isPlaying = true;
				}
				applyLimiter(outputL, limiterL);
				applyLimiter(outputR, limiterR);
				if (hadError) {
					hadError = false;
					dsp?.setWorkletError(null);
				}
			} catch (error) {
				console.error(error);
				if (error instanceof Error && !hadError) {
					hadError = true;
					dsp?.setWorkletError(error.message.split(" in ")[0]);
				}
			}
			if (scheduleProgramsSeekChunks && !--scheduleProgramsSeekChunks) {
				scheduleProgramsSeek = [];
				scheduleRefresh = true;
			}
			state.sampleCount = state.sampleCount + bufferLength;
			if (state.loopBeginSamples >= 0 && state.loopEndSamples > 0) {
				if (state.sampleCount >= state.loopEndSamples) state.sampleCount = state.loopBeginSamples + (state.sampleCount - state.loopEndSamples);
			}
			if (state.projectEndSamples > 0) {
				if (state.sampleCount >= state.projectEndSamples) state.sampleCount = 0 + (state.sampleCount - state.projectEndSamples);
			}
			state.transportSampleCount = state.sampleCount;
			if (idsNowPlaying.symmetricDifference(idsWasPlaying).size !== 0) {
				scheduleRefresh = true;
				idsWasPlaying = new Set(idsNowPlaying);
				idsNowPlaying.clear();
			}
			if (isPlaying && !wasPlaying) {
				scheduleRefresh = true;
				wasPlaying = true;
			}
			if (scheduleRefresh) dsp?.refresh();
			return true;
		}
		function disposePrograms(programsByVmId$1) {
			const seen = /* @__PURE__ */ new Set();
			for (const p of programsByVmId$1.values()) {
				if (seen.has(p)) continue;
				seen.add(p);
				p.dispose();
			}
		}
		function dispose() {
			disposePrograms(programsByVmId);
		}
		const pendingProgramApplied = /* @__PURE__ */ new Map();
		const pendingProgramAppliedSlot = /* @__PURE__ */ new Map();
		const state = {
			dispose,
			runtime,
			programsByVmId,
			programsById,
			pendingProgramApplied,
			pendingProgramAppliedSlot,
			nextProgramId: 0,
			nextId: 0,
			freeProgramIds: [],
			transportU32,
			transportF32,
			nyquist,
			piOverNyquist,
			scheduleStopAndSeekToZero: [],
			get transportSampleCount() {
				return transportF32[SharedTransportIndex.SampleCount];
			},
			set transportSampleCount(v) {
				transportF32[SharedTransportIndex.SampleCount] = v;
			},
			get transportRunning() {
				return Atomics.load(transportU32, SharedTransportIndex.Running);
			},
			set transportRunning(v) {
				Atomics.store(transportU32, SharedTransportIndex.Running, v);
			},
			get transportSeekVersion() {
				return Atomics.load(transportU32, SharedTransportIndex.SeekVersion);
			},
			set transportSeekVersion(v) {
				Atomics.store(transportU32, SharedTransportIndex.SeekVersion, v);
			},
			get transportStopAndSeekToZero() {
				return Atomics.load(transportU32, SharedTransportIndex.StopAndSeekToZero);
			},
			set transportStopAndSeekToZero(v) {
				Atomics.store(transportU32, SharedTransportIndex.StopAndSeekToZero, v);
			},
			get transportActuallyPlaying() {
				return Atomics.load(transportU32, SharedTransportIndex.ActuallyPlaying);
			},
			set transportActuallyPlaying(v) {
				Atomics.store(transportU32, SharedTransportIndex.ActuallyPlaying, v);
			},
			get loopBeginSamples() {
				return Atomics.load(transportU32, SharedTransportIndex.LoopBeginSamples);
			},
			get loopEndSamples() {
				return Atomics.load(transportU32, SharedTransportIndex.LoopEndSamples);
			},
			get projectEndSamples() {
				return Atomics.load(transportU32, SharedTransportIndex.ProjectEndSamples);
			},
			get sampleCount() {
				return sampleCountRef.value;
			},
			set sampleCount(v) {
				sampleCountRef.value = v;
			},
			get bpm() {
				return bpmRef.value;
			},
			set bpm(v) {
				bpmRef.value = v;
			},
			get quantum() {
				return quantumRef.value;
			},
			set quantum(v) {
				quantumRef.value = v;
			},
			get bpmOverrideValue() {
				return bpmOverrideValueRef.value;
			},
			set bpmOverrideValue(v) {
				bpmOverrideValueRef.value = v;
			},
			getProgramById(id) {
				return getProgramById(programsById, id);
			},
			applyControlOps(p, slot, ops) {
				const target = p.slots[slot];
				const max = target.vm.controlOpsCapacity >>> 0;
				const len = Math.min(ops.length, max);
				const nextPtr = target.localControlOpsActive === 0 ? target.vm.localControlOpsPtr1 : target.vm.localControlOpsPtr0;
				const nextOps = new Float32Array(runtime.buffer, nextPtr, max);
				if (len > 0) nextOps.set(ops.subarray(0, len));
				target.controlOpsLength = len;
				target.localControlOpsActive = target.localControlOpsActive === 0 ? 1 : 0;
				if (!bpmOverrideValueRef.value && len > 0) {
					const nextBpm = scanSetBpm(nextOps, len);
					if (nextBpm && nextBpm !== bpmRef.value) {
						bpmRef.value = nextBpm;
						for (const other of programsById.values()) other.bpm = nextBpm;
					}
				}
			},
			setProgramsState(state$1, ids) {
				setProgramsState(programsById, state$1, ids);
			},
			applyTransportSeek(sampleCount) {
				applyTransportSeek(state, sampleCount);
			},
			applyProgramSeek(sampleCount, ids, preview) {
				applyProgramSeek(programsById, sampleCount, ids);
				if (preview) {
					scheduleProgramsSeek = ids;
					scheduleProgramsSeekChunks = PREVIEW_SEEK_CHUNKS;
				}
			},
			processBuffer(_inputs, outputs, dsp) {
				return processBuffer(outputs, dsp);
			}
		};
		return state;
	}
	var DspProcessor = class extends AudioWorkletProcessor {
		sourcemapUrl;
		state = null;
		dsp = null;
		config;
		constructor(options) {
			super();
			this.sourcemapUrl = options.processorOptions.sourcemapUrl;
			this.config = options.processorOptions.config;
			this.dsp = rpc(this.port, this);
		}
		async loadWasm(binary, opts) {
			if (this.state) {
				this.state.dispose();
				this.state = null;
			}
			this.state = await createProcessorState(binary, {
				sourcemapUrl: this.sourcemapUrl,
				config: this.config,
				transportBuffer: opts.transportBuffer
			});
		}
		async getMemory() {
			if (!this.state) throw new Error("No state");
			return this.state.runtime.memory;
		}
		async memoryGrow(delta) {
			return this.state ? this.state.runtime.memoryGrow(delta) : 0;
		}
		async getStats(opts) {
			const s = this.state;
			if (!s) return {
				memoryUsage: 0,
				hasCore: false,
				sampleCount: 0,
				bpm: 120,
				bpmOverride: 0,
				programCount: 0,
				programId: opts?.programId ?? 0,
				programState: 0,
				controlOpsLength: 0,
				programSampleCount: 0,
				vmDebug: null
			};
			const id = opts?.programId ?? 0;
			const p = s.getProgramById(id);
			let vmDebug = null;
			if (p) {
				const vm = p.slots[p.activeSlot].vm;
				const infoPtr = s.runtime.getAudioVmInfoPtr(vm.id);
				const info = new Uint32Array(s.runtime.buffer, infoPtr, AUDIO_VM_INFO_STRIDE);
				vmDebug = {
					arenaAllocated: info[10] ?? 0,
					arenaReused: info[11] ?? 0,
					arenaReleased: info[12] ?? 0,
					arenaInFlight: info[13] ?? 0,
					arenaPCap: info[14] ?? 0,
					arenaPCount: info[15] ?? 0,
					arenaPTomb: info[16] ?? 0,
					arenaBucketsLen: info[17] ?? 0,
					cellsLength: info[18] ?? 0,
					globalsLength: info[19] ?? 0,
					stackTop: info[20] ?? 0,
					callStackLength: info[21] ?? 0,
					upsampleCacheSize: info[22] ?? 0,
					pendingReleaseAudioSize: info[23] ?? 0,
					genPoolSlots: info[24] ?? 0,
					genPoolsLength: info[25] ?? 0,
					bufferRegistrySize: info[26] ?? 0,
					arraysLength: info[27] ?? 0,
					arenaFreed: info[28] ?? 0
				};
			}
			return {
				memoryUsage: s.runtime.memoryUsage() / 1024 / 1024,
				hasCore: true,
				sampleCount: s.sampleCount,
				bpm: s.bpm,
				bpmOverride: s.bpmOverrideValue,
				programCount: s.programsById.size,
				programId: id,
				programState: p ? p.state : 0,
				controlOpsLength: p ? p.slots[p.activeSlot].controlOpsLength : 0,
				programSampleCount: p ? p.sampleCount : 0,
				vmDebug
			};
		}
		async allocateProgramId() {
			const s = this.state;
			if (!s) return 0;
			if (s.freeProgramIds.length > 0) return s.freeProgramIds.pop();
			return s.nextProgramId++;
		}
		async initProgramSlot(opts) {
			const s = this.state;
			if (!s) return null;
			const vmId0 = await this.allocateProgramId();
			const vmId1 = await this.allocateProgramId();
			const sharedState = createSharedProgramStateViewsFromBuffer(opts.stateBuffer ?? (() => {
				track(`sab-state-${vmId0}`, "SharedArrayBuffer", SHARED_PROGRAM_STATE_BYTE_LENGTH, { source: "worklet:initProgramSlot" });
				return new SharedArrayBuffer(SHARED_PROGRAM_STATE_BYTE_LENGTH);
			})());
			const controlOpsCapacity = CONTROL_OPS_CAPACITY;
			const id = s.nextId++;
			const historyMetaBuffers = opts.historyMetaBuffers;
			const vm0 = createAudioVm(s.runtime, vmId0, controlOpsCapacity);
			const vm1 = createAudioVm(s.runtime, vmId1, controlOpsCapacity);
			const runtime = createProgramRuntime({
				vmIds: [vmId0, vmId1],
				vms: [vm0, vm1],
				id,
				stateU32: sharedState.u32,
				stateF32: sharedState.f32,
				bpm: s.bpm,
				historyMetaBuffers
			});
			s.programsByVmId.set(vm0.id, runtime);
			s.programsByVmId.set(vm1.id, runtime);
			s.programsById.set(runtime.id, runtime);
			return runtime.toSharedInit();
		}
		async disposeProgram(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			p.reset();
			s.programsByVmId.delete(p.slots[0].vm.id);
			s.programsByVmId.delete(p.slots[1].vm.id);
			s.programsById.delete(p.id);
			p.dispose();
			s.freeProgramIds.push(p.slots[0].vm.id);
			s.freeProgramIds.push(p.slots[1].vm.id);
		}
		async setProgramSync(_opts) {}
		async getProgramShared(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			return p.toSharedInit();
		}
		async setControlOps(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			s.applyControlOps(p, p.activeSlot, opts.ops);
			const transportPlaying = s.transportRunning === SharedTransportRunningState.Start;
			if (p.state !== DspProgramState.Start || !transportPlaying) return;
			const deferred = Deferred();
			s.pendingProgramApplied.set(p.id, deferred);
			s.pendingProgramAppliedSlot.set(p.id, p.activeSlot);
			return deferred.promise;
		}
		async setControlOpsSwap(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			const from = p.activeSlot;
			const to = from ^ 1;
			s.runtime.copyAudioVmState(p.slots[from].vm.id, p.slots[to].vm.id);
			s.applyControlOps(p, to, opts.ops);
			const transportPlaying = s.transportRunning === SharedTransportRunningState.Start;
			if (p.state === DspProgramState.Start && transportPlaying) {
				const fadeSamples = Math.max(0, Math.round(opts.fadeSamples ?? PROGRAM_SWAP_FADE_SAMPLES)) || PROGRAM_SWAP_FADE_SAMPLES;
				p.swapFadeFrom = from;
				p.swapFadeTo = to;
				p.swapFadeRemaining = fadeSamples;
				p.swapFadeTotal = fadeSamples;
				p.activeSlot = to;
			} else {
				p.swapFadeRemaining = 0;
				p.swapFadeTotal = 0;
				p.activeSlot = to;
			}
			if (p.state !== DspProgramState.Start || !transportPlaying) return;
			const deferred = Deferred();
			s.pendingProgramApplied.set(p.id, deferred);
			s.pendingProgramAppliedSlot.set(p.id, p.activeSlot);
			return deferred.promise;
		}
		async getVmInfoPtr(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			const vm = p.slots[p.activeSlot].vm;
			return {
				vmId: vm.id,
				infoPtr: vm.infoPtr
			};
		}
		async getMemoryInfo() {
			return {
				snapshot: getSnapshot(),
				samples: sampleManager.getSampleMemoryInfo()
			};
		}
		async getRequiredSamples() {
			const required = [];
			for (const handle of sampleManager.getRequiredSamples()) {
				const req = sampleManager.getRecordRequest(handle);
				required.push({
					handle,
					freesoundId: sampleManager.getFreesoundId(handle),
					recordSeconds: req?.seconds,
					recordCallbackId: req?.callbackId
				});
			}
			return required;
		}
		async setSampleData(opts) {
			const channels = opts.channels.map((sab) => new Float32Array(sab));
			sampleManager.setSampleData(opts.handle, channels, opts.sampleRate);
		}
		async setSampleError(opts) {
			sampleManager.setSampleError(opts.handle, opts.error);
		}
		async connectRecord(port) {
			rpc(port, this);
			port.start();
		}
		async setSampleDataDirect(opts) {
			sampleManager.setSampleData(opts.handle, opts.channels, opts.sampleRate);
		}
		async setSampleErrorDirect(opts) {
			sampleManager.setSampleError(opts.handle, opts.error);
		}
		async syncSampleRegistrations(opts) {
			if (opts.invalidatedHandles) for (const handle of opts.invalidatedHandles) sampleManager.clearHandle(handle);
			for (const reg of opts.registrations) if (reg.type === "freesound" && reg.freesoundId !== void 0) sampleManager.ensureFreesoundHandle(reg.handle, reg.freesoundId);
			else if (reg.type === "record" && reg.recordSeconds !== void 0 && reg.recordCallbackId !== void 0) sampleManager.ensureRecordHandle(reg.handle, reg.recordSeconds, reg.recordCallbackId);
			else if (reg.type === "inline" || reg.type === "espeak") sampleManager.ensureInlineHandle(reg.handle);
		}
		async bpmOverride(opts) {
			const s = this.state;
			if (!s) return;
			s.bpmOverrideValue = Number(opts.bpm) || 0;
			s.runtime.setBpmOverride(s.bpmOverrideValue);
			if (s.bpmOverrideValue) s.bpm = s.bpmOverrideValue;
		}
		getInits() {
			const s = this.state;
			if (!s) throw new Error("No state");
			const inits = [];
			for (const p of s.programsById.values()) inits.push(p.toSharedInit());
			return inits;
		}
		async start(programIds) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.setProgramsState(DspProgramState.Start, programIds);
			s.transportRunning = SharedTransportRunningState.Start;
			return this.getInits();
		}
		async stop(programIds) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.scheduleStopAndSeekToZero = programIds;
			s.transportStopAndSeekToZero = 1;
			s.transportRunning = SharedTransportRunningState.Stop;
			return this.getInits();
		}
		async pause(programIds) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.setProgramsState(DspProgramState.Pause, programIds);
			if ([...s.programsById.values()].filter((p) => p.state === DspProgramState.Start).every((p) => programIds.includes(p.id))) s.transportRunning = SharedTransportRunningState.Pause;
			return this.getInits();
		}
		async seek(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.applyTransportSeek(opts.sampleCount);
			s.applyProgramSeek(opts.sampleCount, opts.programIds, opts.preview);
			return this.getInits();
		}
		async seekPrograms(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.applyProgramSeek(opts.sampleCount, opts.programIds, opts.preview);
			return this.getInits();
		}
		async setProgramGain(opts) {
			const s = this.state;
			if (!s) throw new Error("No state");
			const p = s.getProgramById(opts.programId);
			if (!p) throw new Error("Program not found with id: " + opts.programId);
			p.gain = Number(opts.gain) || 0;
		}
		async swapPrograms(programIds1, programIds2) {
			const s = this.state;
			if (!s) throw new Error("No state");
			s.setProgramsState(DspProgramState.Stop, programIds1);
			s.setProgramsState(DspProgramState.Start, programIds2);
			return this.getInits();
		}
		process(_inputs, outputs) {
			const s = this.state;
			if (!s) return true;
			return s.processBuffer(_inputs, outputs, this.dsp ?? null);
		}
	};
	registerProcessor("dsp", DspProcessor);
})();

//# sourceMappingURL=worklet-BQ3EWRiK.js.map