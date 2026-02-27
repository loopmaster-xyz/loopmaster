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
	const Getter = (cb, target = {}) => new Proxy(target, { get: (_$1, key) => cb(key) });
	const defaultTransferables = [typeof OffscreenCanvas !== "undefined" ? OffscreenCanvas : void 0, typeof MessagePort !== "undefined" ? MessagePort : void 0].filter(Boolean);
	const rpc = (port, api = {}, transferables = defaultTransferables) => {
		const xfer = (args, transferables$1) => args.reduce((p$1, n$1) => {
			if (typeof n$1 === "object") {
				if (transferables$1.some((ctor) => n$1 instanceof ctor)) p$1.push(n$1);
				else for (const key in n$1) if (n$1[key] && transferables$1.some((ctor) => n$1[key] instanceof ctor)) p$1.push(n$1[key]);
			}
			return p$1;
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
				console.error(`Rpc call failed: "${method}"`, args.map((x$1) => x$1.constructor.name + ": " + x$1.toString()), error);
			}
			return deferred.promise;
		};
		return Getter((key) => key === "then" ? void 0 : call.bind(null, key), call);
	};
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
	const genSpecs = [
		{
			id: 0,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 1,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 2,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 3,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 4,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 5,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 6,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 7,
			genName: "Phasor",
			variantName: "default",
			className: "Phasor_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 8,
			genName: "Every",
			variantName: "default",
			className: "Every_default_bars_scalar",
			paramNames: ["bars"],
			paramModes: ["scalar"],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 9,
			genName: "Every",
			variantName: "default",
			className: "Every_default_bars_audio",
			paramNames: ["bars"],
			paramModes: ["audio"],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 10,
			genName: "White",
			variantName: "default",
			className: "White_default_seed_scalar_trig_scalar",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 11,
			genName: "White",
			variantName: "default",
			className: "White_default_seed_scalar_trig_audio",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 12,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 13,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_scalar_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 14,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_scalar_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 15,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_scalar_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 16,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_audio_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 17,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_audio_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 18,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_audio_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 19,
			genName: "Lfosqr",
			variantName: "default",
			className: "Lfosqr_default_bar_audio_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 20,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_scalar_seed_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 21,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_scalar_seed_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 22,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_scalar_seed_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 23,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_scalar_seed_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 24,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_audio_seed_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 25,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_audio_seed_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 26,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_audio_seed_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 27,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_scalar_offset_audio_seed_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 28,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_scalar_seed_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 29,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_scalar_seed_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 30,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_scalar_seed_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 31,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_scalar_seed_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 32,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_audio_seed_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 33,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_audio_seed_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 34,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_audio_seed_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 35,
			genName: "Lfosah",
			variantName: "default",
			className: "Lfosah_default_bar_audio_offset_audio_seed_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"seed",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 36,
			genName: "Dc",
			variantName: "default",
			className: "Dc_default_",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: true
		},
		{
			id: 37,
			genName: "Gauss",
			variantName: "default",
			className: "Gauss_default_seed_scalar_trig_scalar",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 38,
			genName: "Gauss",
			variantName: "default",
			className: "Gauss_default_seed_scalar_trig_audio",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 39,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 40,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 41,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 42,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 43,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 44,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 45,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 46,
			genName: "Impulse",
			variantName: "default",
			className: "Impulse_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 47,
			genName: "TestGain",
			variantName: "default",
			className: "TestGain_default_amount_scalar",
			paramNames: ["amount"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 48,
			genName: "TestGain",
			variantName: "default",
			className: "TestGain_default_amount_audio",
			paramNames: ["amount"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 49,
			genName: "TestGain",
			variantName: "default",
			className: "TestGain_default_amount_scalar_stereo",
			paramNames: ["amount"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 50,
			genName: "TestGain",
			variantName: "default",
			className: "TestGain_default_amount_audio_stereo",
			paramNames: ["amount"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 51,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_scalar_damping_scalar",
			paramNames: ["room", "damping"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 52,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_scalar_damping_audio",
			paramNames: ["room", "damping"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 53,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_audio_damping_scalar",
			paramNames: ["room", "damping"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 54,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_audio_damping_audio",
			paramNames: ["room", "damping"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 55,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_scalar_damping_scalar_stereo",
			paramNames: ["room", "damping"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 56,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_scalar_damping_audio_stereo",
			paramNames: ["room", "damping"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 57,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_audio_damping_scalar_stereo",
			paramNames: ["room", "damping"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 58,
			genName: "Freeverb",
			variantName: "default",
			className: "Freeverb_default_room_audio_damping_audio_stereo",
			paramNames: ["room", "damping"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 59,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 60,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 61,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 62,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 63,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 64,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 65,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 66,
			genName: "Saw",
			variantName: "default",
			className: "Saw_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 67,
			genName: "TestOversample",
			variantName: "default",
			className: "TestOversample_default_",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		},
		{
			id: 68,
			genName: "TestOversample",
			variantName: "default",
			className: "TestOversample_default__stereo",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		},
		{
			id: 69,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 70,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 71,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 72,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 73,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 74,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 75,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 76,
			genName: "Sine",
			variantName: "default",
			className: "Sine_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 77,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 78,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_scalar_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 79,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_scalar_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 80,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_scalar_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 81,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_audio_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 82,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_audio_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 83,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_audio_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 84,
			genName: "Lfosine",
			variantName: "default",
			className: "Lfosine_default_bar_audio_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 85,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 86,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 87,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 88,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 89,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 90,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 91,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 92,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 93,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 94,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 95,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 96,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 97,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 98,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 99,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 100,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 101,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 102,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 103,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 104,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 105,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 106,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 107,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 108,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 109,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 110,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 111,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 112,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 113,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 114,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 115,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 116,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 117,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 118,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 119,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 120,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 121,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 122,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 123,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 124,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 125,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 126,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 127,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 128,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 129,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 130,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 131,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 132,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_scalar_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 133,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 134,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 135,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 136,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_scalar_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 137,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 138,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 139,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 140,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_scalar_slice_audio_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 141,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 142,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 143,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 144,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_scalar_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 145,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 146,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 147,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 148,
			genName: "Slicer",
			variantName: "default",
			className: "Slicer_default_sample_scalar_speed_audio_offset_audio_slice_audio_threshold_scalar_repeat_audio_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"slice",
				"threshold",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [
				"slicePosition",
				"slicePlaying",
				"currentSlice"
			],
			usesInput: false
		},
		{
			id: 149,
			genName: "Brown",
			variantName: "default",
			className: "Brown_default_seed_scalar_trig_scalar",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 150,
			genName: "Brown",
			variantName: "default",
			className: "Brown_default_seed_scalar_trig_audio",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 151,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_scalar_offset_scalar_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 152,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_scalar_offset_scalar_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 153,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_scalar_offset_audio_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 154,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_scalar_offset_audio_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 155,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_audio_offset_scalar_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 156,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_audio_offset_scalar_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 157,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_audio_offset_audio_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 158,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_scalar_steps_audio_offset_audio_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 159,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_scalar_offset_scalar_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 160,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_scalar_offset_scalar_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 161,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_scalar_offset_audio_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 162,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_scalar_offset_audio_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 163,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_audio_offset_scalar_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 164,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_audio_offset_scalar_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 165,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_audio_offset_audio_bar_scalar",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 166,
			genName: "Euclid",
			variantName: "default",
			className: "Euclid_default_pulses_audio_steps_audio_offset_audio_bar_audio",
			paramNames: [
				"pulses",
				"steps",
				"offset",
				"bar"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 167,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 168,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 169,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 170,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 171,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 172,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 173,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 174,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_scalar_width_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 175,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 176,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 177,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 178,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 179,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 180,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 181,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 182,
			genName: "Pwm",
			variantName: "default",
			className: "Pwm_default_hz_audio_width_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"width",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 183,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 184,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 185,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 186,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 187,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 188,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 189,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 190,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_scalar_decay_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 191,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 192,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 193,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 194,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 195,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 196,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 197,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 198,
			genName: "Ad",
			variantName: "default",
			className: "Ad_default_attack_audio_decay_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 199,
			genName: "Onepole",
			variantName: "lp1",
			className: "Onepole_lp1_cutoff_scalar",
			paramNames: ["cutoff"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 200,
			genName: "Onepole",
			variantName: "lp1",
			className: "Onepole_lp1_cutoff_audio",
			paramNames: ["cutoff"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 201,
			genName: "Onepole",
			variantName: "hp1",
			className: "Onepole_hp1_cutoff_scalar",
			paramNames: ["cutoff"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 202,
			genName: "Onepole",
			variantName: "hp1",
			className: "Onepole_hp1_cutoff_audio",
			paramNames: ["cutoff"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 203,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 204,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 205,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 206,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 207,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 208,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 209,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 210,
			genName: "Sqr",
			variantName: "default",
			className: "Sqr_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 211,
			genName: "Hold",
			variantName: "default",
			className: "Hold_default_",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: true
		},
		{
			id: 212,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 213,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_scalar_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 214,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_scalar_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 215,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_scalar_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 216,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_audio_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 217,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_audio_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 218,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_audio_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 219,
			genName: "Lfosaw",
			variantName: "default",
			className: "Lfosaw_default_bar_audio_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 220,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 221,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 222,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 223,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 224,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 225,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 226,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 227,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_scalar_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 228,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 229,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 230,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 231,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 232,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 233,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 234,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 235,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_scalar_threshold_audio_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 236,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 237,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 238,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 239,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 240,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 241,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 242,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 243,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_scalar_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 244,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 245,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 246,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 247,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 248,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 249,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 250,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 251,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_scalar_release_audio_threshold_audio_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 252,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 253,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 254,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 255,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 256,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 257,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 258,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 259,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_scalar_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 260,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 261,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 262,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 263,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 264,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 265,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 266,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 267,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_scalar_threshold_audio_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 268,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 269,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 270,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 271,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 272,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 273,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 274,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 275,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_scalar_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 276,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_scalar_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 277,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_scalar_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 278,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_scalar_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 279,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_scalar_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 280,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_audio_knee_scalar_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 281,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_audio_knee_scalar_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 282,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_audio_knee_audio_key_scalar",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 283,
			genName: "Compressor",
			variantName: "default",
			className: "Compressor_default_attack_audio_release_audio_threshold_audio_ratio_audio_knee_audio_key_audio",
			paramNames: [
				"attack",
				"release",
				"threshold",
				"ratio",
				"knee",
				"key"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["inputLevel", "gainReduction"],
			usesInput: true
		},
		{
			id: 284,
			genName: "Emit",
			variantName: "default",
			className: "Emit_default_value_scalar",
			paramNames: ["value"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 285,
			genName: "Emit",
			variantName: "default",
			className: "Emit_default_value_audio",
			paramNames: ["value"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 286,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_scalar_gain_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 287,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_scalar_gain_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 288,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_scalar_gain_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 289,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_scalar_gain_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 290,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_audio_gain_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 291,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_audio_gain_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 292,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_audio_gain_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 293,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_scalar_octaves_audio_gain_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 294,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_scalar_gain_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 295,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_scalar_gain_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 296,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_scalar_gain_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 297,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_scalar_gain_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 298,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_audio_gain_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 299,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_audio_gain_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 300,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_audio_gain_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 301,
			genName: "Fractal",
			variantName: "default",
			className: "Fractal_default_seed_scalar_rate_audio_octaves_audio_gain_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"octaves",
				"gain",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 302,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 303,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_scalar_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 304,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_scalar_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 305,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_scalar_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 306,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_audio_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 307,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_audio_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 308,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_audio_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 309,
			genName: "Lforamp",
			variantName: "default",
			className: "Lforamp_default_bar_audio_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 310,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 311,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 312,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 313,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 314,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 315,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 316,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 317,
			genName: "Tri",
			variantName: "default",
			className: "Tri_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 318,
			genName: "Pitchshift",
			variantName: "default",
			className: "Pitchshift_default_ratio_scalar",
			paramNames: ["ratio"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 319,
			genName: "Pitchshift",
			variantName: "default",
			className: "Pitchshift_default_ratio_audio",
			paramNames: ["ratio"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 320,
			genName: "Zerox",
			variantName: "default",
			className: "Zerox_default_",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: true
		},
		{
			id: 321,
			genName: "Limiter",
			variantName: "default",
			className: "Limiter_default_threshold_scalar_release_scalar",
			paramNames: ["threshold", "release"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 322,
			genName: "Limiter",
			variantName: "default",
			className: "Limiter_default_threshold_scalar_release_audio",
			paramNames: ["threshold", "release"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 323,
			genName: "Limiter",
			variantName: "default",
			className: "Limiter_default_threshold_audio_release_scalar",
			paramNames: ["threshold", "release"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 324,
			genName: "Limiter",
			variantName: "default",
			className: "Limiter_default_threshold_audio_release_audio",
			paramNames: ["threshold", "release"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 325,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_scalar_every_scalar_prob_scalar_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 326,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_scalar_every_scalar_prob_audio_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 327,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_scalar_every_audio_prob_scalar_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 328,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_scalar_every_audio_prob_audio_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 329,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_audio_every_scalar_prob_scalar_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 330,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_audio_every_scalar_prob_audio_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 331,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_audio_every_audio_prob_scalar_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 332,
			genName: "At",
			variantName: "default",
			className: "At_default_bar_audio_every_audio_prob_audio_seed_scalar",
			paramNames: [
				"bar",
				"every",
				"prob",
				"seed"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 333,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_scalar_k_scalar_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 334,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_scalar_k_scalar_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 335,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_scalar_k_audio_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 336,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_scalar_k_audio_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 337,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_audio_k_scalar_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 338,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_audio_k_scalar_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 339,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_audio_k_audio_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 340,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_scalar_q_audio_k_audio_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 341,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_scalar_k_scalar_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 342,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_scalar_k_scalar_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 343,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_scalar_k_audio_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 344,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_scalar_k_audio_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 345,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_audio_k_scalar_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 346,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_audio_k_scalar_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 347,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_audio_k_audio_sat_scalar",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 348,
			genName: "Diodeladder",
			variantName: "default",
			className: "Diodeladder_default_cutoff_audio_q_audio_k_audio_sat_audio",
			paramNames: [
				"cutoff",
				"q",
				"k",
				"sat"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 349,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 350,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 351,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 352,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 353,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 354,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 355,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 356,
			genName: "Ramp",
			variantName: "default",
			className: "Ramp_default_hz_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: false
		},
		{
			id: 357,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_scalar_curve_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 358,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_scalar_curve_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 359,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_scalar_curve_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 360,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_scalar_curve_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 361,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_audio_curve_scalar_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 362,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_audio_curve_scalar_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 363,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_audio_curve_audio_trig_scalar",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 364,
			genName: "Smooth",
			variantName: "default",
			className: "Smooth_default_seed_scalar_rate_audio_curve_audio_trig_audio",
			paramNames: [
				"seed",
				"rate",
				"curve",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 365,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 366,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_scalar_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 367,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_scalar_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 368,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_scalar_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 369,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_audio_offset_scalar_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 370,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_audio_offset_scalar_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 371,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_audio_offset_audio_trig_scalar",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 372,
			genName: "Lfotri",
			variantName: "default",
			className: "Lfotri_default_bar_audio_offset_audio_trig_audio",
			paramNames: [
				"bar",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 373,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 374,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 375,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 376,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 377,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 378,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 379,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 380,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_scalar_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 381,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 382,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 383,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 384,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 385,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 386,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 387,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 388,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_scalar_sustain_audio_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 389,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 390,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 391,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 392,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 393,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 394,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 395,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 396,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_scalar_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 397,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 398,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 399,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 400,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 401,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 402,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 403,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 404,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_scalar_decay_audio_sustain_audio_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 405,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 406,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 407,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 408,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 409,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 410,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 411,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 412,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_scalar_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 413,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 414,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 415,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 416,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 417,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 418,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 419,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 420,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_scalar_sustain_audio_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 421,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 422,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 423,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 424,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 425,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 426,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 427,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 428,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_scalar_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 429,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_scalar_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 430,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_scalar_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 431,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_scalar_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 432,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_scalar_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 433,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_audio_exponent_scalar_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 434,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_audio_exponent_scalar_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 435,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_audio_exponent_audio_trig_scalar",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 436,
			genName: "Adsr",
			variantName: "default",
			className: "Adsr_default_attack_audio_decay_audio_sustain_audio_release_audio_exponent_audio_trig_audio",
			paramNames: [
				"attack",
				"decay",
				"sustain",
				"release",
				"exponent",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["stage", "env"],
			usesInput: false
		},
		{
			id: 437,
			genName: "Analyser",
			variantName: "default",
			className: "Analyser_default_",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: true
		},
		{
			id: 438,
			genName: "Biquad",
			variantName: "lp",
			className: "Biquad_lp_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 439,
			genName: "Biquad",
			variantName: "lp",
			className: "Biquad_lp_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 440,
			genName: "Biquad",
			variantName: "lp",
			className: "Biquad_lp_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 441,
			genName: "Biquad",
			variantName: "lp",
			className: "Biquad_lp_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 442,
			genName: "Biquad",
			variantName: "hp",
			className: "Biquad_hp_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 443,
			genName: "Biquad",
			variantName: "hp",
			className: "Biquad_hp_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 444,
			genName: "Biquad",
			variantName: "hp",
			className: "Biquad_hp_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 445,
			genName: "Biquad",
			variantName: "hp",
			className: "Biquad_hp_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 446,
			genName: "Biquad",
			variantName: "bp",
			className: "Biquad_bp_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 447,
			genName: "Biquad",
			variantName: "bp",
			className: "Biquad_bp_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 448,
			genName: "Biquad",
			variantName: "bp",
			className: "Biquad_bp_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 449,
			genName: "Biquad",
			variantName: "bp",
			className: "Biquad_bp_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 450,
			genName: "Biquad",
			variantName: "bs",
			className: "Biquad_bs_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 451,
			genName: "Biquad",
			variantName: "bs",
			className: "Biquad_bs_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 452,
			genName: "Biquad",
			variantName: "bs",
			className: "Biquad_bs_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 453,
			genName: "Biquad",
			variantName: "bs",
			className: "Biquad_bs_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 454,
			genName: "Biquad",
			variantName: "ap",
			className: "Biquad_ap_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 455,
			genName: "Biquad",
			variantName: "ap",
			className: "Biquad_ap_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 456,
			genName: "Biquad",
			variantName: "ap",
			className: "Biquad_ap_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 457,
			genName: "Biquad",
			variantName: "ap",
			className: "Biquad_ap_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 458,
			genName: "Envfollow",
			variantName: "default",
			className: "Envfollow_default_attack_scalar_release_scalar",
			paramNames: ["attack", "release"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 459,
			genName: "Envfollow",
			variantName: "default",
			className: "Envfollow_default_attack_scalar_release_audio",
			paramNames: ["attack", "release"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 460,
			genName: "Envfollow",
			variantName: "default",
			className: "Envfollow_default_attack_audio_release_scalar",
			paramNames: ["attack", "release"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 461,
			genName: "Envfollow",
			variantName: "default",
			className: "Envfollow_default_attack_audio_release_audio",
			paramNames: ["attack", "release"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 462,
			genName: "Sah",
			variantName: "default",
			className: "Sah_default_trig_scalar",
			paramNames: ["trig"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 463,
			genName: "Sah",
			variantName: "default",
			className: "Sah_default_trig_audio",
			paramNames: ["trig"],
			paramModes: ["audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 464,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_scalar_decay_scalar",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 465,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_scalar_decay_audio",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 466,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_audio_decay_scalar",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 467,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_audio_decay_audio",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 468,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_scalar_decay_scalar",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 469,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_scalar_decay_audio",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 470,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_audio_decay_scalar",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 471,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_audio_decay_audio",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 472,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_scalar_decay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 473,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_scalar_decay_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 474,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_audio_decay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 475,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_scalar_damping_audio_decay_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 476,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_scalar_decay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 477,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_scalar_decay_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 478,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_audio_decay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 479,
			genName: "Velvet",
			variantName: "default",
			className: "Velvet_default_room_audio_damping_audio_decay_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 480,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_scalar_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 481,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_scalar_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 482,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_audio_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 483,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_audio_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 484,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_scalar_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 485,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_scalar_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 486,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_audio_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 487,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_audio_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 488,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_scalar_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 489,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_scalar_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 490,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_audio_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 491,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_audio_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 492,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_scalar_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 493,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_scalar_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 494,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_audio_depth_scalar",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 495,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_audio_depth_audio",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 496,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_scalar_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 497,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_scalar_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 498,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_audio_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 499,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_scalar_decay_audio_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 500,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_scalar_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 501,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_scalar_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 502,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_audio_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 503,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_scalar_damping_audio_decay_audio_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 504,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_scalar_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 505,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_scalar_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 506,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_audio_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 507,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_scalar_decay_audio_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 508,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_scalar_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 509,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_scalar_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 510,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_audio_depth_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 511,
			genName: "Fdn",
			variantName: "default",
			className: "Fdn_default_room_audio_damping_audio_decay_audio_depth_audio_stereo",
			paramNames: [
				"room",
				"damping",
				"decay",
				"depth"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 512,
			genName: "Pink",
			variantName: "default",
			className: "Pink_default_seed_scalar_trig_scalar",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 513,
			genName: "Pink",
			variantName: "default",
			className: "Pink_default_seed_scalar_trig_audio",
			paramNames: ["seed", "trig"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 514,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_scalar_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 515,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_scalar_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 516,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_audio_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 517,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_audio_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 518,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_scalar_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 519,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_scalar_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 520,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_audio_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 521,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_audio_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 522,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_scalar_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 523,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_scalar_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 524,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_audio_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 525,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_scalar_damping_audio_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 526,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_scalar_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 527,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_scalar_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 528,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_audio_bandwidth_scalar_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 529,
			genName: "Dattorro",
			variantName: "default",
			className: "Dattorro_default_room_audio_damping_audio_bandwidth_audio_indiff1_scalar_indiff2_scalar_decdiff1_scalar_decdiff2_scalar_excrate_scalar_excdepth_scalar_predelay_scalar_stereo",
			paramNames: [
				"room",
				"damping",
				"bandwidth",
				"indiff1",
				"indiff2",
				"decdiff1",
				"decdiff2",
				"excrate",
				"excdepth",
				"predelay"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 530,
			genName: "Random",
			variantName: "default",
			className: "Random_default_seed_scalar",
			paramNames: ["seed"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 531,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_scalar_down_scalar_exp_scalar",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 532,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_scalar_down_scalar_exp_audio",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 533,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_scalar_down_audio_exp_scalar",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 534,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_scalar_down_audio_exp_audio",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 535,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_audio_down_scalar_exp_scalar",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 536,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_audio_down_scalar_exp_audio",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 537,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_audio_down_audio_exp_scalar",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 538,
			genName: "Slew",
			variantName: "default",
			className: "Slew_default_up_audio_down_audio_exp_audio",
			paramNames: [
				"up",
				"down",
				"exp"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 539,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 540,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 541,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 542,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 543,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 544,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 545,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 546,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_scalar_ceil_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 547,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_scalar_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 548,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_scalar_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 549,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_scalar_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 550,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_scalar_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 551,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_audio_offset_scalar_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 552,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_audio_offset_scalar_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 553,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_audio_offset_audio_trig_scalar",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"scalar"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 554,
			genName: "Inc",
			variantName: "default",
			className: "Inc_default_hz_audio_ceil_audio_offset_audio_trig_audio",
			paramNames: [
				"hz",
				"ceil",
				"offset",
				"trig"
			],
			paramModes: [
				"audio",
				"audio",
				"audio",
				"audio"
			],
			emitNames: ["phase"],
			usesInput: false
		},
		{
			id: 555,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_scalar_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 556,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_scalar_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 557,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_scalar_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 558,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_scalar_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 559,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_audio_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 560,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_audio_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 561,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_audio_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 562,
			genName: "Biquadshelf",
			variantName: "ls",
			className: "Biquadshelf_ls_cutoff_audio_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 563,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_scalar_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 564,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_scalar_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 565,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_scalar_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 566,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_scalar_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 567,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_audio_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 568,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_audio_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 569,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_audio_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 570,
			genName: "Biquadshelf",
			variantName: "hs",
			className: "Biquadshelf_hs_cutoff_audio_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 571,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_scalar_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 572,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_scalar_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 573,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_scalar_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 574,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_scalar_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"scalar",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 575,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_audio_q_scalar_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 576,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_audio_q_scalar_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"scalar",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 577,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_audio_q_audio_gain_scalar",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"scalar"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 578,
			genName: "Biquadshelf",
			variantName: "peak",
			className: "Biquadshelf_peak_cutoff_audio_q_audio_gain_audio",
			paramNames: [
				"cutoff",
				"q",
				"gain"
			],
			paramModes: [
				"audio",
				"audio",
				"audio"
			],
			emitNames: [],
			usesInput: true
		},
		{
			id: 579,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_scalar_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 580,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_scalar_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 581,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_audio_repeat_scalar_trig_scalar",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 582,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_audio_repeat_scalar_trig_audio",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 583,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_scalar_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"scalar"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 584,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_scalar_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"scalar",
				"scalar",
				"audio"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 585,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_audio_repeat_scalar_trig_scalar_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"scalar"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 586,
			genName: "Sampler",
			variantName: "default",
			className: "Sampler_default_sample_scalar_speed_scalar_offset_audio_repeat_scalar_trig_audio_stereo",
			paramNames: [
				"sample",
				"speed",
				"offset",
				"repeat",
				"trig"
			],
			paramModes: [
				"scalar",
				"scalar",
				"audio",
				"scalar",
				"audio"
			],
			emitNames: ["position", "playing"],
			usesInput: false
		},
		{
			id: 587,
			genName: "Moog",
			variantName: "lpm",
			className: "Moog_lpm_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 588,
			genName: "Moog",
			variantName: "lpm",
			className: "Moog_lpm_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 589,
			genName: "Moog",
			variantName: "hpm",
			className: "Moog_hpm_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 590,
			genName: "Moog",
			variantName: "hpm",
			className: "Moog_hpm_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 591,
			genName: "Svf",
			variantName: "lps",
			className: "Svf_lps_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 592,
			genName: "Svf",
			variantName: "lps",
			className: "Svf_lps_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 593,
			genName: "Svf",
			variantName: "lps",
			className: "Svf_lps_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 594,
			genName: "Svf",
			variantName: "lps",
			className: "Svf_lps_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 595,
			genName: "Svf",
			variantName: "hps",
			className: "Svf_hps_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 596,
			genName: "Svf",
			variantName: "hps",
			className: "Svf_hps_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 597,
			genName: "Svf",
			variantName: "hps",
			className: "Svf_hps_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 598,
			genName: "Svf",
			variantName: "hps",
			className: "Svf_hps_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 599,
			genName: "Svf",
			variantName: "bps",
			className: "Svf_bps_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 600,
			genName: "Svf",
			variantName: "bps",
			className: "Svf_bps_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 601,
			genName: "Svf",
			variantName: "bps",
			className: "Svf_bps_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 602,
			genName: "Svf",
			variantName: "bps",
			className: "Svf_bps_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 603,
			genName: "Svf",
			variantName: "bss",
			className: "Svf_bss_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 604,
			genName: "Svf",
			variantName: "bss",
			className: "Svf_bss_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 605,
			genName: "Svf",
			variantName: "bss",
			className: "Svf_bss_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 606,
			genName: "Svf",
			variantName: "bss",
			className: "Svf_bss_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 607,
			genName: "Svf",
			variantName: "peaks",
			className: "Svf_peaks_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 608,
			genName: "Svf",
			variantName: "peaks",
			className: "Svf_peaks_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 609,
			genName: "Svf",
			variantName: "peaks",
			className: "Svf_peaks_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 610,
			genName: "Svf",
			variantName: "peaks",
			className: "Svf_peaks_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 611,
			genName: "Svf",
			variantName: "aps",
			className: "Svf_aps_cutoff_scalar_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 612,
			genName: "Svf",
			variantName: "aps",
			className: "Svf_aps_cutoff_scalar_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["scalar", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 613,
			genName: "Svf",
			variantName: "aps",
			className: "Svf_aps_cutoff_audio_q_scalar",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "scalar"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 614,
			genName: "Svf",
			variantName: "aps",
			className: "Svf_aps_cutoff_audio_q_audio",
			paramNames: ["cutoff", "q"],
			paramModes: ["audio", "audio"],
			emitNames: [],
			usesInput: true
		},
		{
			id: 615,
			genName: "Table",
			variantName: "lookup",
			className: "Table_lookup",
			paramNames: ["len", "index"],
			paramModes: ["scalar", "scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 616,
			genName: "Tram",
			variantName: "default",
			className: "TramKernel",
			paramNames: [],
			paramModes: [],
			emitNames: ["fired"],
			usesInput: false
		},
		{
			id: 617,
			genName: "Mini",
			variantName: "default",
			className: "MiniKernel",
			paramNames: ["bars"],
			paramModes: ["scalar"],
			emitNames: [],
			usesInput: false
		},
		{
			id: 618,
			genName: "Timeline",
			variantName: "default",
			className: "TimelineKernel",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		},
		{
			id: 619,
			genName: "Out",
			variantName: "default",
			className: "Out",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		},
		{
			id: 620,
			genName: "Mix",
			variantName: "default",
			className: "Mix",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		},
		{
			id: 621,
			genName: "ArrayGet",
			variantName: "default",
			className: "ArrayGet",
			paramNames: ["index"],
			paramModes: ["scalar"],
			emitNames: ["index"],
			usesInput: false
		},
		{
			id: 622,
			genName: "Solo",
			variantName: "default",
			className: "Solo",
			paramNames: [],
			paramModes: [],
			emitNames: [],
			usesInput: false
		}
	];
	function computePeaks(ch0, w$1) {
		const len = ch0.length | 0;
		const outW = Math.max(1, w$1 | 0);
		const out = new Float32Array(outW * 2);
		if (len <= 0) {
			out.fill(0);
			return out;
		}
		for (let i$1 = 0; i$1 < outW; i$1++) {
			const from = Math.floor(i$1 * len / outW);
			const to = Math.floor((i$1 + 1) * len / outW);
			const a$1 = Math.max(0, Math.min(len - 1, from));
			const b$1 = Math.max(a$1 + 1, Math.min(len, to));
			let mn = ch0[a$1] ?? 0;
			let mx = mn;
			for (let j$1 = a$1 + 1; j$1 < b$1; j$1++) {
				const v$1 = ch0[j$1] ?? 0;
				if (v$1 < mn) mn = v$1;
				if (v$1 > mx) mx = v$1;
			}
			const base = i$1 * 2;
			out[base] = mn;
			out[base + 1] = mx;
		}
		return out;
	}
	const clamp = (v$1, lo, hi) => Math.max(lo, Math.min(hi, v$1));
	function detectSlices(samples, threshold, max) {
		const m$1 = Math.max(1, max | 0);
		const points = new Int32Array(m$1);
		const len = samples.length | 0;
		if (len <= 0) return {
			points,
			count: 0
		};
		let count = 0;
		const thr = clamp(threshold, 0, 1);
		const desiredBuckets = Math.max(256, Math.min(16384, m$1 * 16 | 0));
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
		for (let i$1 = 0; i$1 < bucketCount; i$1++) {
			const base = i$1 * 2;
			const mn = peaks[base] ?? 0;
			const mx = peaks[base + 1] ?? 0;
			const amp = Math.max(Math.abs(mn), Math.abs(mx));
			const d$1 = i$1 === 0 ? 0 : Math.max(0, amp - prevAmp);
			rise[i$1] = d$1;
			if (d$1 > riseMax) riseMax = d$1;
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
		const bucketStart = (b$1) => Math.floor(b$1 * len / bucketCount);
		for (let frame = 1; frame < bucketCount && count < m$1; frame++) {
			const e$1 = rise[frame] ?? 0;
			fast += (e$1 - fast) * fastCoeff;
			slow += (e$1 - slow) * slowCoeff;
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
						const s$1 = bucketStart(posBucket);
						if (s$1 > (count > 0 ? points[count - 1] ?? 0 : -1)) {
							points[count++] = s$1;
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
		registerInlineSample(channels, sampleRate) {
			const handle = this.nextHandle++;
			const copiedChannels = channels.map((ch) => new Float32Array(ch));
			this.samples.set(handle, {
				id: handle,
				channels: copiedChannels,
				length: copiedChannels[0]?.length ?? 0,
				sampleRate,
				ready: copiedChannels.length > 0 && (copiedChannels[0]?.length ?? 0) > 0
			});
			this.bumpVersion(handle);
			return handle;
		}
		getRecordRequest(handle) {
			return this.recordRequests.get(handle);
		}
		setSampleData(handle, channels, sampleRate) {
			const sample = this.samples.get(handle);
			if (!sample) return;
			sample.channels = channels;
			sample.length = channels[0]?.length ?? 0;
			sample.sampleRate = sampleRate;
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
		recordSample(handle, audioData, sampleRate) {
			const sample = this.samples.get(handle);
			if (!sample) return;
			sample.channels = audioData.map((ch) => new Float32Array(ch));
			sample.length = audioData[0]?.length ?? 0;
			sample.sampleRate = sampleRate;
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
	const gens = {
		Phasor: {
			name: "Phasor",
			description: "Phase ramp 0..1 with trigger reset",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Every: {
			name: "Every",
			description: "Generates an impulse on a regular period in bars",
			category: "sequencers",
			parameters: [{
				name: "bars",
				default: .25,
				min: 1e-4,
				unit: "bars",
				description: "Number of bars per impulse"
			}]
		},
		White: {
			name: "White",
			description: "Uniform white noise with trigger reset",
			category: "generators",
			parameters: [{
				name: "seed",
				default: 0,
				description: "Seed (any value, float bits used)"
			}, {
				name: "trig",
				description: "Trigger resets phase"
			}]
		},
		Lfosqr: {
			name: "Lfosqr",
			description: "Tempo-synced LFO square 0..1",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Lfosah: {
			name: "Lfosah",
			description: "Tempo-synced LFO sample-and-hold (random 0..1 per cycle)",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "seed",
					default: 0,
					description: "Seed (any value, float bits used)"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Dc: {
			name: "Dc",
			description: "DC blocker (~8 Hz highpass, removes offset)",
			category: "filters",
			parameters: [{
				name: "input",
				description: "Input signal"
			}]
		},
		Gauss: {
			name: "Gauss",
			description: "Gaussian (normal-ish) noise via CLT from 6 uniforms, trigger reset",
			category: "generators",
			parameters: [{
				name: "seed",
				default: 0,
				description: "Seed (any value, float bits used)"
			}, {
				name: "trig",
				description: "Trigger resets phase"
			}]
		},
		Impulse: {
			name: "Impulse",
			description: "Impulse train (1 at phase 0, 0 elsewhere)",
			category: "sequencers",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		TestGain: {
			name: "TestGain",
			description: "Simple gain/amplifier",
			category: "test",
			parameters: [{
				name: "input",
				description: "Input signal"
			}, {
				name: "amount",
				default: 1,
				min: 0,
				max: 2,
				description: "Gain amount"
			}]
		},
		Freeverb: {
			name: "Freeverb",
			description: "Freeverb reverb",
			category: "effects",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "room",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Room size"
				},
				{
					name: "damping",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Damping"
				}
			]
		},
		Saw: {
			name: "Saw",
			description: "Band-limited sawtooth oscillator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		TestOversample: {
			name: "TestOversample",
			description: "Test generator that outputs sample rate dependent signal",
			category: "test",
			parameters: []
		},
		Sine: {
			name: "Sine",
			description: "Sine wave generator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					unit: "phase",
					description: "Offset phase"
				},
				{
					name: "trig",
					unit: "impulse",
					description: "Trigger impulse"
				}
			]
		},
		Lfosine: {
			name: "Lfosine",
			description: "Tempo-synced LFO sine 0..1",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Slicer: {
			name: "Slicer",
			description: "Slice-based sample player",
			category: "samplers",
			parameters: [
				{
					name: "sample",
					unit: "handle",
					description: "Sample handle from freesound() or record()"
				},
				{
					name: "speed",
					default: 1,
					unit: "multiplier",
					description: "Playback speed (negative for reverse)"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					max: 1,
					unit: "phase",
					description: "Offset phase within slice"
				},
				{
					name: "slice",
					default: 0,
					min: 0,
					max: 1,
					unit: "fraction",
					description: "Slice index (0..1)"
				},
				{
					name: "threshold",
					default: 0,
					min: 0,
					max: 1,
					unit: "fraction",
					description: "Slice detection threshold"
				},
				{
					name: "repeat",
					default: 0,
					unit: "boolean",
					description: "Loop slice when not 0"
				},
				{
					name: "trig",
					description: "Trigger to restart playback"
				}
			]
		},
		Brown: {
			name: "Brown",
			description: "Brownian (random walk) noise",
			category: "generators",
			parameters: [{
				name: "seed",
				default: 0,
				description: "Seed"
			}, {
				name: "trig",
				description: "Trigger resets walk"
			}]
		},
		Euclid: {
			name: "Euclid",
			description: "Euclidean rhythm trigger (pulses over steps with offset)",
			category: "sequencers",
			parameters: [
				{
					name: "pulses",
					default: 4,
					min: 0,
					description: "Number of hits"
				},
				{
					name: "steps",
					default: 8,
					min: 1,
					description: "Number of steps"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Rotation offset"
				},
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Pattern length in bars"
				}
			]
		},
		Pwm: {
			name: "Pwm",
			description: "Band-limited PWM oscillator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "width",
					default: .5,
					min: 0,
					max: 1,
					description: "Pulse width"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Ad: {
			name: "Ad",
			description: "Attack/Decay envelope",
			category: "generators",
			parameters: [
				{
					name: "attack",
					default: .005,
					min: 1e-5,
					unit: "s",
					description: "Attack time"
				},
				{
					name: "decay",
					default: .2,
					min: 1e-5,
					unit: "s",
					description: "Decay time"
				},
				{
					name: "exponent",
					default: 1,
					description: "Curve (0=linear, >0=power, <0=mirrored)"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Onepole: {
			name: "Onepole",
			description: "One-pole filter (lowpass / highpass)",
			category: "filters",
			variants: {
				lp1: "Lowpass filter (One-pole)",
				hp1: "Highpass filter (One-pole)"
			},
			parameters: [{
				name: "input",
				description: "Input signal"
			}, {
				name: "cutoff",
				default: 1e3,
				min: 20,
				max: 2e4,
				unit: "hz",
				description: "Cutoff frequency"
			}]
		},
		Sqr: {
			name: "Sqr",
			description: "Band-limited square oscillator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Hold: {
			name: "Hold",
			description: "Holds its input if zero is received",
			category: "utilities",
			parameters: [{
				name: "input",
				description: "Input signal"
			}]
		},
		Lfosaw: {
			name: "Lfosaw",
			description: "Tempo-synced LFO saw 0..1",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Compressor: {
			name: "Compressor",
			description: "Dynamic range compressor with soft knee",
			category: "mixing",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "attack",
					default: .003,
					min: 1e-4,
					max: 1,
					unit: "s",
					description: "Attack time"
				},
				{
					name: "release",
					default: .1,
					min: 1e-4,
					max: 5,
					unit: "s",
					description: "Release time"
				},
				{
					name: "threshold",
					default: -12,
					min: -80,
					max: 0,
					unit: "dB",
					description: "Threshold in dB"
				},
				{
					name: "ratio",
					default: 4,
					min: 1,
					max: 20,
					description: "Compression ratio"
				},
				{
					name: "knee",
					default: 6,
					min: 0,
					max: 40,
					unit: "dB",
					description: "Knee width in dB"
				},
				{
					name: "key",
					description: "Key/sidechain input (unpatched = use input as key)"
				}
			]
		},
		Emit: {
			name: "Emit",
			description: "Emits a value",
			category: "test",
			parameters: [{
				name: "value",
				description: "Value to emit"
			}]
		},
		Fractal: {
			name: "Fractal",
			description: "Fractal (octave-sum) noise with rate, octaves, gain",
			category: "generators",
			parameters: [
				{
					name: "seed",
					default: 0,
					description: "Seed"
				},
				{
					name: "rate",
					default: 2,
					min: 0,
					unit: "hz",
					description: "Base rate"
				},
				{
					name: "octaves",
					default: 4,
					min: 1,
					max: 16,
					description: "Number of octaves"
				},
				{
					name: "gain",
					default: .5,
					min: 0,
					max: 1,
					description: "Octave amplitude decay"
				},
				{
					name: "trig",
					description: "Trigger resets phase"
				}
			]
		},
		Lforamp: {
			name: "Lforamp",
			description: "Tempo-synced LFO ramp 0..1",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Tri: {
			name: "Tri",
			description: "Band-limited triangle oscillator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Pitchshift: {
			name: "Pitchshift",
			description: "Grain-based pitch shifter (overlap-add)",
			category: "effects",
			parameters: [{
				name: "input",
				description: "Input signal"
			}, {
				name: "ratio",
				default: 1,
				min: .01,
				max: 10,
				unit: "multiplier",
				description: "Pitch ratio (e.g. 2 = one octave up)"
			}]
		},
		Zerox: {
			name: "Zerox",
			description: "Positive zero-crossing detector (1 when input crosses from ≤0 to >0)",
			category: "utilities",
			parameters: [{
				name: "input",
				description: "Input signal"
			}]
		},
		Limiter: {
			name: "Limiter",
			description: "Peak limiter with release smoothing",
			category: "mixing",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "threshold",
					default: 0,
					min: -80,
					max: 0,
					unit: "dB",
					description: "Limit threshold in dB"
				},
				{
					name: "release",
					default: .1,
					min: 1e-4,
					max: 5,
					unit: "s",
					description: "Release time"
				}
			]
		},
		At: {
			name: "At",
			description: "Probabilistic trigger at bar start and/or every N bars",
			category: "sequencers",
			parameters: [
				{
					name: "bar",
					default: 0,
					min: 0,
					unit: "bars",
					description: "Start time in bars"
				},
				{
					name: "every",
					default: .25,
					min: 0,
					unit: "bars",
					description: "Interval in bars (0 = single trigger at start)"
				},
				{
					name: "prob",
					default: 1,
					min: 0,
					max: 1,
					unit: "factor",
					description: "Probability of 1 when trigger fires"
				},
				{
					name: "seed",
					default: 0,
					description: "Seed for deterministic random"
				}
			]
		},
		Diodeladder: {
			name: "Diodeladder",
			description: "Diode ladder filter (4-pole, with HPF and soft saturation)",
			category: "filters",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "cutoff",
					default: 1e3,
					min: 20,
					max: 2e4,
					unit: "hz",
					description: "Cutoff frequency"
				},
				{
					name: "q",
					default: .5,
					min: 0,
					max: 1,
					description: "Resonance"
				},
				{
					name: "k",
					default: 0,
					min: 0,
					max: 1,
					description: "HPF amount"
				},
				{
					name: "sat",
					default: 1,
					min: .1,
					max: 10,
					description: "Input saturation"
				}
			]
		},
		Ramp: {
			name: "Ramp",
			description: "Band-limited ramp (inverse saw) oscillator",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 440,
					min: 0,
					unit: "hz",
					description: "Frequency"
				},
				{
					name: "offset",
					min: 0,
					max: 1,
					description: "Offset phase"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Smooth: {
			name: "Smooth",
			description: "Smooth interpolated random steps with rate and curve",
			category: "generators",
			parameters: [
				{
					name: "seed",
					default: 0,
					description: "Seed"
				},
				{
					name: "rate",
					default: 2,
					min: 0,
					unit: "hz",
					description: "Step rate"
				},
				{
					name: "curve",
					default: 1,
					description: "Interpolation curve (0=linear, 1=smooth5)"
				},
				{
					name: "trig",
					description: "Trigger resets acc"
				}
			]
		},
		Lfotri: {
			name: "Lfotri",
			description: "Tempo-synced LFO triangle 0..1",
			category: "generators",
			parameters: [
				{
					name: "bar",
					default: 1,
					min: 0,
					unit: "bars",
					description: "Cycle length in bars"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Phase offset in beats"
				},
				{
					name: "trig",
					description: "Trigger reset"
				}
			]
		},
		Adsr: {
			name: "Adsr",
			description: "Attack/Decay/Sustain/Release envelope",
			category: "generators",
			parameters: [
				{
					name: "attack",
					default: .005,
					min: 1e-5,
					unit: "s",
					description: "Attack time"
				},
				{
					name: "decay",
					default: .2,
					min: 1e-5,
					unit: "s",
					description: "Decay time"
				},
				{
					name: "sustain",
					default: .7,
					min: 0,
					max: 1,
					description: "Sustain level (0..1)"
				},
				{
					name: "release",
					default: .3,
					min: 1e-5,
					unit: "s",
					description: "Release time"
				},
				{
					name: "exponent",
					default: 1,
					description: "Curve (0=linear, >0=power, <0=mirrored)"
				},
				{
					name: "trig",
					description: "Trigger (gate): high = hold sustain, low = release"
				}
			]
		},
		Analyser: {
			name: "Analyser",
			description: "Analyze the signal",
			category: "utilities",
			parameters: [{
				name: "input",
				description: "Input signal"
			}]
		},
		Biquad: {
			name: "Biquad",
			description: "Biquad filter",
			category: "filters",
			variants: {
				lp: "Lowpass filter (Biquad)",
				hp: "Highpass filter (Biquad)",
				bp: "Bandpass filter (Biquad)",
				bs: "Bandstop filter (Biquad)",
				ap: "Allpass filter (Biquad)"
			},
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "cutoff",
					default: 1e3,
					min: 20,
					max: 2e4,
					unit: "hz",
					description: "Cutoff frequency"
				},
				{
					name: "q",
					default: .70710678,
					min: .01,
					max: 20,
					description: "Q factor"
				}
			]
		},
		Envfollow: {
			name: "Envfollow",
			description: "Envelope follower with attack and release time",
			category: "utilities",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "attack",
					default: .01,
					min: 1e-4,
					max: 10,
					unit: "s",
					description: "Attack time"
				},
				{
					name: "release",
					default: .1,
					min: 1e-4,
					max: 10,
					unit: "s",
					description: "Release time"
				}
			]
		},
		Sah: {
			name: "Sah",
			description: "Sample-and-hold: capture input on trigger rising edge",
			category: "utilities",
			parameters: [{
				name: "input",
				description: "Input signal"
			}, {
				name: "trig",
				description: "Trigger: on rising edge, hold current input"
			}]
		},
		Velvet: {
			name: "Velvet",
			description: "Velvet noise stereo reverb (prime-based delay lines)",
			category: "effects",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "room",
					default: .5,
					min: .05,
					max: 1,
					unit: "normal",
					description: "Room size"
				},
				{
					name: "damping",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "High-frequency damping"
				},
				{
					name: "decay",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Decay / feedback"
				}
			]
		},
		Fdn: {
			name: "Fdn",
			description: "Feedback delay network reverb (8-line Hadamard, modulated)",
			category: "effects",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "room",
					default: .5,
					min: .05,
					max: 1,
					unit: "normal",
					description: "Room size"
				},
				{
					name: "damping",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "High-frequency damping"
				},
				{
					name: "decay",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Decay / feedback"
				},
				{
					name: "depth",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Delay modulation depth"
				}
			]
		},
		Pink: {
			name: "Pink",
			description: "1/f pink noise (Voss-McCartney 8 rows)",
			category: "generators",
			parameters: [{
				name: "seed",
				default: 0,
				description: "Seed"
			}, {
				name: "trig",
				description: "Trigger resets"
			}]
		},
		Dattorro: {
			name: "Dattorro",
			description: "Dattorro-style stereo reverb (modulated tank)",
			category: "effects",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "room",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Room size / decay"
				},
				{
					name: "damping",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "High-frequency damping"
				},
				{
					name: "bandwidth",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Input bandwidth"
				},
				{
					name: "indiff1",
					default: .75,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Input diffusion 1"
				},
				{
					name: "indiff2",
					default: .625,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Input diffusion 2"
				},
				{
					name: "decdiff1",
					default: .7,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Decay diffusion 1"
				},
				{
					name: "decdiff2",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Decay diffusion 2"
				},
				{
					name: "excrate",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Modulation rate"
				},
				{
					name: "excdepth",
					default: .5,
					min: 0,
					max: 1,
					unit: "normal",
					description: "Modulation depth"
				},
				{
					name: "predelay",
					default: 0,
					min: 0,
					max: 1,
					unit: "s",
					description: "Pre-delay"
				}
			]
		},
		Random: {
			name: "Random",
			description: "Deterministic uniform [0,1] per sample from seed",
			category: "math",
			parameters: [{
				name: "seed",
				default: 0,
				description: "Seed"
			}]
		},
		Slew: {
			name: "Slew",
			description: "Slew rate limiter with separate rise/fall and curve",
			category: "utilities",
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "up",
					default: .5,
					min: 0,
					max: 1,
					description: "Rise coefficient (0=slow, 1=instant)"
				},
				{
					name: "down",
					default: .5,
					min: 0,
					max: 1,
					description: "Fall coefficient (0=slow, 1=instant); ≤0 uses up"
				},
				{
					name: "exp",
					default: 1,
					description: "Curve exponent (0=linear, >0=power, <0=mirrored)"
				}
			]
		},
		Inc: {
			name: "Inc",
			description: "Ramp from offset to ceil at hz rate, trigger reset",
			category: "generators",
			parameters: [
				{
					name: "hz",
					default: 1,
					min: 0,
					unit: "hz",
					description: "Rate"
				},
				{
					name: "ceil",
					default: 1,
					min: 0,
					description: "Ceiling value"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					description: "Value on trigger"
				},
				{
					name: "trig",
					description: "Trigger impulse"
				}
			]
		},
		Biquadshelf: {
			name: "Biquadshelf",
			description: "Biquad shelf and peak filters (gain-based)",
			category: "filters",
			variants: {
				ls: "Low shelf (Biquad)",
				hs: "High shelf (Biquad)",
				peak: "Peak (notch) (Biquad)"
			},
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "cutoff",
					default: 1e3,
					min: 20,
					max: 2e4,
					unit: "hz",
					description: "Cutoff frequency"
				},
				{
					name: "q",
					default: .70710678,
					min: .01,
					max: 20,
					description: "Q factor (peak only)"
				},
				{
					name: "gain",
					default: 0,
					min: -40,
					max: 40,
					unit: "dB",
					description: "Gain in dB"
				}
			]
		},
		Sampler: {
			name: "Sampler",
			description: "Sample player",
			category: "samplers",
			parameters: [
				{
					name: "sample",
					description: "Sample handle from freesound() or record()"
				},
				{
					name: "speed",
					default: 1,
					description: "Playback speed (negative for reverse)"
				},
				{
					name: "offset",
					default: 0,
					min: 0,
					max: 1,
					description: "Normalized start offset"
				},
				{
					name: "repeat",
					default: 0,
					description: "Loop sample when > 0"
				},
				{
					name: "trig",
					description: "Trigger to restart playback"
				}
			]
		},
		Moog: {
			name: "Moog",
			description: "Moog ladder filter (4-pole, nonlinear)",
			category: "filters",
			variants: {
				lpm: "Lowpass filter (Moog)",
				hpm: "Highpass filter (Moog)"
			},
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "cutoff",
					default: 1e3,
					min: 50,
					max: 22040,
					unit: "hz",
					description: "Cutoff frequency"
				},
				{
					name: "q",
					default: .70710678,
					min: .01,
					max: .985,
					description: "Q factor"
				}
			]
		},
		Svf: {
			name: "Svf",
			description: "State variable filter (SVF)",
			category: "filters",
			variants: {
				lps: "Lowpass filter (SVF)",
				hps: "Highpass filter (SVF)",
				bps: "Bandpass filter (SVF)",
				bss: "Bandstop filter (SVF)",
				peaks: "Peak (notch) filter (SVF)",
				aps: "Allpass filter (SVF)"
			},
			parameters: [
				{
					name: "input",
					description: "Input signal"
				},
				{
					name: "cutoff",
					default: 1e3,
					min: 50,
					max: 2e4,
					unit: "hz",
					description: "Cutoff frequency"
				},
				{
					name: "q",
					default: .70710678,
					min: .01,
					max: .985,
					description: "Q factor"
				}
			]
		}
	};
	let Y = (H$1, A) => 0 != (H$1 & A), r = (H$1) => {
		let E$1 = new Uint8Array(H$1.length);
		return H$1.split("").forEach((H$2, A) => {
			E$1[A] = H$2.charCodeAt(0);
		}), E$1;
	}, t = (H$1) => {
		var A = new Uint8Array(4);
		return A[0] = H$1, A[1] = H$1 >> 8, A[2] = H$1 >> 16, A[3] = H$1 >> 24, A;
	}, O = (H$1) => {
		var A = new Uint8Array(2);
		return A[0] = H$1, A[1] = H$1 >> 8, A;
	}, I = null, R = (H$1) => {
		let A = new Uint8Array(44 + H$1.length), E$1 = 0, e$1 = (H$2) => {
			A.set(H$2, E$1), E$1 += H$2.length;
		};
		return e$1(r("RIFF")), e$1(t(H$1.length + 12 + 16 + 8 - 8)), e$1(r("WAVE")), e$1(r("fmt ")), e$1(t(16)), e$1(O(1)), e$1(O(1)), e$1(t(22050)), e$1(t(22050)), e$1(O(1)), e$1(O(8)), e$1(r("data")), e$1(t(H$1.length)), e$1(H$1), A;
	}, l = {
		" ": 0,
		"!": 2,
		"\"": 2,
		"#": 2,
		$: 2,
		"%": 2,
		"&": 2,
		"'": 130,
		"(": 0,
		")": 0,
		"*": 2,
		"+": 2,
		",": 2,
		"-": 2,
		".": 2,
		"/": 2,
		0: 3,
		1: 3,
		2: 3,
		3: 3,
		4: 3,
		5: 3,
		6: 3,
		7: 3,
		8: 3,
		9: 3,
		":": 2,
		";": 2,
		"<": 2,
		"=": 2,
		">": 2,
		"?": 2,
		"@": 2,
		A: 192,
		B: 168,
		C: 176,
		D: 172,
		E: 192,
		F: 160,
		G: 184,
		H: 160,
		I: 192,
		J: 188,
		K: 160,
		L: 172,
		M: 168,
		N: 172,
		O: 192,
		P: 160,
		Q: 160,
		R: 172,
		S: 180,
		T: 164,
		U: 192,
		V: 168,
		W: 168,
		X: 176,
		Y: 192,
		Z: 188,
		"[": 0,
		"\\": 0,
		"]": 0,
		"^": 2,
		_: 0,
		"`": 32
	}, U = 128, n = (H$1, A) => 0 != (l[H$1] & A), N = (H$1, A, E$1) => n(H$1[A], E$1), W = (H$1, A) => -1 !== A.indexOf(H$1), E = (H$1) => {
		let A = H$1.split("="), e$1 = A.pop(), E$1 = A.join("=").split("("), r$1 = E$1.pop().split(")"), t$1 = E$1[0], O$1 = r$1[0], R$1 = r$1[1], I$1 = [
			"T",
			"C",
			"S"
		], Y$1 = [
			"E",
			"I",
			"Y"
		], l$1 = (H$2, A$1, E$2) => {
			if (H$2.startsWith(O$1, A$1) && ((A$2, E$3) => {
				for (let H$3 = t$1.length - 1; -1 < H$3; H$3--) {
					var e$2 = t$1[H$3];
					if (n(e$2, U)) {
						if (A$2[--E$3] !== e$2) return !1;
					} else if (!{
						" ": () => !N(A$2, --E$3, U),
						"#": () => N(A$2, --E$3, 64),
						".": () => N(A$2, --E$3, 8),
						"&": () => N(A$2, --E$3, 16) || W(A$2.substr(--E$3, 2), ["CH", "SH"]),
						"@": () => {
							var H$4;
							return !!N(A$2, --E$3, 4) || "H" === (H$4 = A$2[E$3]) && !!W(H$4, I$1);
						},
						"^": () => N(A$2, --E$3, 32),
						"+": () => W(A$2[--E$3], Y$1),
						":": () => {
							for (; 0 <= E$3 && N(A$2, E$3 - 1, 32);) E$3--;
							return !0;
						}
					}[e$2]()) return !1;
				}
				return !0;
			})(H$2, A$1) && ((A$2, E$3) => {
				for (let H$3 = 0; H$3 < R$1.length; H$3++) {
					var e$2 = R$1[H$3];
					if (n(e$2, U)) {
						if (A$2[++E$3] !== e$2) return !1;
					} else if (!{
						" ": () => !N(A$2, ++E$3, U),
						"#": () => N(A$2, ++E$3, 64),
						".": () => N(A$2, ++E$3, 8),
						"&": () => N(A$2, ++E$3, 16) || W(A$2.substr(++E$3 - 2, 2), ["HC", "HS"]),
						"@": () => {
							var H$4;
							return !!N(A$2, ++E$3, 4) || "H" === (H$4 = A$2[E$3]) && !!W(H$4, I$1);
						},
						"^": () => N(A$2, ++E$3, 32),
						"+": () => W(A$2[++E$3], Y$1),
						":": () => {
							for (; N(A$2, E$3 + 1, 32);) E$3++;
							return !0;
						},
						"%": () => {
							if ("E" !== A$2[E$3 + 1]) return "ING" === A$2.substr(E$3 + 1, 3) && (E$3 += 3, !0);
							if (N(A$2, E$3 + 2, U)) {
								if (!W(A$2[E$3 + 2], [
									"R",
									"S",
									"D"
								])) return "L" !== A$2[E$3 + 2] ? "FUL" === A$2.substr(E$3 + 2, 3) && (E$3 += 4, !0) : "Y" === A$2[E$3 + 3] && (E$3 += 3, !0);
								E$3 += 2;
							} else E$3++;
							return !0;
						}
					}[e$2]()) return !1;
				}
				return !0;
			})(H$2, A$1 + (O$1.length - 1))) return E$2(e$1, O$1.length), !0;
		};
		return l$1.c = O$1[0], l$1;
	}, S = {}, T = (" (A.)=EH4Y. |(A) =AH| (ARE) =AAR| (AR)O=AXR|(AR)#=EH4R| ^(AS)#=EY4S|(A)WA=AX|(AW)=AO5| :(ANY)=EH4NIY|(A)^+#=EY5|#:(ALLY)=ULIY| (AL)#=UL|(AGAIN)=AXGEH4N|#:(AG)E=IHJ|(A)^%=EY|(A)^+:#=AE| :(A)^+ =EY4| (ARR)=AXR|(ARR)=AE4R| ^(AR) =AA5R|(AR)=AA5R|(AIR)=EH4R|(AI)=EY4|(AY)=EY5|(AU)=AO4|#:(AL) =UL|#:(ALS) =ULZ|(ALK)=AO4K|(AL)^=AOL| :(ABLE)=EY4BUL|(ABLE)=AXBUL|(A)VO=EY4|(ANG)+=EY4NJ|(ATARI)=AHTAA4RIY|(A)TOM=AE|(A)TTI=AE| (AT) =AET| (A)T=AH|(A)=AE| (B) =BIY4| (BE)^#=BIH|(BEING)=BIY4IHNX| (BOTH) =BOW4TH| (BUS)#=BIH4Z|(BREAK)=BREY5K|(BUIL)=BIH4L|(B)=B| (C) =SIY4| (CH)^=K|^E(CH)=K|(CHA)R#=KEH5|(CH)=CH| S(CI)#=SAY4|(CI)A=SH|(CI)O=SH|(CI)EN=SH|(CITY)=SIHTIY|(C)+=S|(CK)=K|(COMMODORE)=KAA4MAHDOHR|(COM)=KAHM|(CUIT)=KIHT|(CREA)=KRIYEY|(C)=K| (D) =DIY4| (DR.) =DAA4KTER|#:(DED) =DIHD|.E(D) =D|#:^E(D) =T| (DE)^#=DIH| (DO) =DUW| (DOES)=DAHZ|(DONE) =DAH5N|(DOING)=DUW4IHNX| (DOW)=DAW|#(DU)A=JUW|#(DU)^#=JAX|(D)=D| (E) =IYIY4|#:(E) =|':^(E) =| :(E) =IY|#(ED) =D|#:(E)D =|(EV)ER=EH4V|(E)^%=IY4|(ERI)#=IY4RIY|(ERI)=EH4RIH|#:(ER)#=ER|(ERROR)=EH4ROHR|(ERASE)=IHREY5S|(ER)#=EHR|(ER)=ER| (EVEN)=IYVEHN|#:(E)W=|@(EW)=UW|(EW)=YUW|(E)O=IY|#:&(ES) =IHZ|#:(E)S =|#:(ELY) =LIY|#:(EMENT)=MEHNT|(EFUL)=FUHL|(EE)=IY4|(EARN)=ER5N| (EAR)^=ER5|(EAD)=EHD|#:(EA) =IYAX|(EA)SU=EH5|(EA)=IY5|(EIGH)=EY4|(EI)=IY4| (EYE)=AY4|(EY)=IY|(EU)=YUW5|(EQUAL)=IY4KWUL|(E)=EH| (F) =EH4F|(FUL)=FUHL|(FRIEND)=FREH5ND|(FATHER)=FAA4DHER|(F)F=|(F)=F| (G) =JIY4|(GIV)=GIH5V| (G)I^=G|(GE)T=GEH5|SU(GGES)=GJEH4S|(GG)=G| B#(G)=G|(G)+=J|(GREAT)=GREY4T|(GON)E=GAO5N|#(GH)=| (GN)=N|(G)=G| (H) =EY4CH| (HAV)=/HAE6V| (HERE)=/HIYR| (HOUR)=AW5ER|(HOW)=/HAW|(H)#=/H|(H)=| (IN)=IHN| (I) =AY4|(I) =AY|(IN)D=AY5N|SEM(I)=IY| ANT(I)=AY|(IER)=IYER|#:R(IED) =IYD|(IED) =AY5D|(IEN)=IYEHN|(IE)T=AY4EH|(I')=AY5| :(I)^%=AY5| :(IE) =AY4|(I)%=IY|(IE)=IY4| (IDEA)=AYDIY5AH|(I)^+:#=IH|(IR)#=AYR|(IZ)%=AYZ|(IS)%=AYZ|I^(I)^#=IH|+^(I)^+=AY|#:^(I)^+=IH|(I)^+=AY|(IR)=ER|(IGH)=AY4|(ILD)=AY5LD| (IGN)=IHGN|(IGN) =AY4N|(IGN)^=AY4N|(IGN)%=AY4N|(ICRO)=AY4KROH|(IQUE)=IY4K|(I)=IH| (J) =JEY4|(J)=J| (K) =KEY4| (K)N=|(K)=K| (L) =EH4L|(LO)C#=LOW|L(L)=|#:^(L)%=UL|(LEAD)=LIYD| (LAUGH)=LAE4F|(L)=L| (M) =EH4M| (MR.) =MIH4STER| (MS.)=MIH5Z| (MRS.) =MIH4SIXZ|(MOV)=MUW4V|(MACHIN)=MAHSHIY5N|M(M)=|(M)=M| (N) =EH4N|E(NG)+=NJ|(NG)R=NXG|(NG)#=NXG|(NGL)%=NXGUL|(NG)=NX|(NK)=NXK| (NOW) =NAW4|N(N)=|(NON)E=NAH4N|(N)=N| (O) =OH4W|(OF) =AHV| (OH) =OW5|(OROUGH)=ER4OW|#:(OR) =ER|#:(ORS) =ERZ|(OR)=AOR| (ONE)=WAHN|#(ONE) =WAHN|(OW)=OW| (OVER)=OW5VER|PR(O)V=UW4|(OV)=AH4V|(O)^%=OW5|(O)^EN=OW|(O)^I#=OW5|(OL)D=OW4L|(OUGHT)=AO5T|(OUGH)=AH5F| (OU)=AW|H(OU)S#=AW4|(OUS)=AXS|(OUR)=OHR|(OULD)=UH5D|(OU)^L=AH5|(OUP)=UW5P|(OU)=AW|(OY)=OY|(OING)=OW4IHNX|(OI)=OY5|(OOR)=OH5R|(OOK)=UH5K|F(OOD)=UW5D|L(OOD)=AH5D|M(OOD)=UW5D|(OOD)=UH5D|F(OOT)=UH5T|(OO)=UW5|(O')=OH|(O)E=OW|(O) =OW|(OA)=OW4| (ONLY)=OW4NLIY| (ONCE)=WAH4NS|(ON'T)=OW4NT|C(O)N=AA|(O)NG=AO| :^(O)N=AH|I(ON)=UN|#:(ON)=UN|#^(ON)=UN|(O)ST=OW|(OF)^=AO4F|(OTHER)=AH5DHER|R(O)B=RAA|^R(O):#=OW5|(OSS) =AO5S|#:^(OM)=AHM|(O)=AA| (P) =PIY4|(PH)=F|(PEOPL)=PIY5PUL|(POW)=PAW4|(PUT) =PUHT|(P)P=|(P)S=|(P)N=|(PROF.)=PROHFEH4SER|(P)=P| (Q) =KYUW4|(QUAR)=KWOH5R|(QU)=KW|(Q)=K| (R) =AA5R| (RE)^#=RIY|(R)R=|(R)=R| (S) =EH4S|(SH)=SH|#(SION)=ZHUN|(SOME)=SAHM|#(SUR)#=ZHER|(SUR)#=SHER|#(SU)#=ZHUW|#(SSU)#=SHUW|#(SED)=ZD|#(S)#=Z|(SAID)=SEHD|^(SION)=SHUN|(S)S=|.(S) =Z|#:.E(S) =Z|#:^#(S) =S|U(S) =S| :#(S) =Z|##(S) =Z| (SCH)=SK|(S)C+=|#(SM)=ZUM|#(SN)'=ZUM|(STLE)=SUL|(S)=S| (T) =TIY4| (THE) #=DHIY| (THE) =DHAX|(TO) =TUX| (THAT)=DHAET| (THIS) =DHIHS| (THEY)=DHEY| (THERE)=DHEHR|(THER)=DHER|(THEIR)=DHEHR| (THAN) =DHAEN| (THEM) =DHAEN|(THESE) =DHIYZ| (THEN)=DHEHN|(THROUGH)=THRUW4|(THOSE)=DHOHZ|(THOUGH) =DHOW|(TODAY)=TUXDEY|(TOMO)RROW=TUMAA5|(TO)TAL=TOW5| (THUS)=DHAH4S|(TH)=TH|#:(TED)=TIXD|S(TI)#N=CH|(TI)O=SH|(TI)A=SH|(TIEN)=SHUN|(TUR)#=CHER|(TU)A=CHUW| (TWO)=TUW|&(T)EN =|(T)=T| (U) =YUW4| (UN)I=YUWN| (UN)=AHN| (UPON)=AXPAON|@(UR)#=UH4R|(UR)#=YUH4R|(UR)=ER|(U)^ =AH|(U)^^=AH5|(UY)=AY5| G(U)#=|G(U)%=|G(U)#=W|#N(U)=YUW|@(U)=UW|(U)=YUW| (V) =VIY4|(VIEW)=VYUW5|(V)=V| (W) =DAH4BULYUW| (WERE)=WER|(WA)SH=WAA|(WA)ST=WEY|(WA)S=WAH|(WA)T=WAA|(WHERE)=WHEHR|(WHAT)=WHAHT|(WHOL)=/HOWL|(WHO)=/HUW|(WH)=WH|(WAR)#=WEHR|(WAR)=WAOR|(WOR)^=WER|(WR)=R|(WOM)A=WUHM|(WOM)E=WIHM|(WEA)R=WEH|(WANT)=WAA5NT|ANS(WER)=ER|(W)=W| (X) =EH4KR| (X)=Z|(X)=KS| (Y) =WAY4|(YOUNG)=YAHNX| (YOUR)=YOHR| (YOU)=YUW| (YES)=YEHS| (Y)=Y|F(Y)=AY|PS(YCH)=AYK|#:^(Y)=IY|#:^(Y)I=IY| :(Y) =AY| :(Y)#=AY| :(Y)^+:#=IH| :(Y)^#=AY|(Y)=IH| (Z) =ZIY4|(Z)=Z".split("|").map((H$1) => {
		var A = (H$1 = E(H$1)).c;
		S[A] = S[A] || [], S[A].push(H$1);
	}), "(A)=|(!)=.|(\") =-AH5NKWOWT-|(\")=KWOW4T-|(#)= NAH4MBER|($)= DAA4LER|(%)= PERSEH4NT|(&)= AEND|(')=|(*)= AE4STERIHSK|(+)= PLAH4S|(,)=,| (-) =-|(-)=|(.)= POYNT|(/)= SLAE4SH|(0)= ZIY4ROW| (1ST)=FER4ST| (10TH)=TEH4NTH|(1)= WAH4N| (2ND)=SEH4KUND|(2)= TUW4| (3RD)=THER4D|(3)= THRIY4|(4)= FOH4R| (5TH)=FIH4FTH|(5)= FAY4V| (64) =SIH4KSTIY FOHR|(6)= SIH4KS|(7)= SEH4VUN| (8TH)=EY4TH|(8)= EY4T|(9)= NAY4N|(:)=.|(;)=.|(<)= LEH4S DHAEN|(=)= IY4KWULZ|(>)= GREY4TER DHAEN|(?)=?|(@)= AE6T|(^)= KAE4RIXT".split("|").map(E)), f = "*12345678".split(""), e = " *.*?*,*-*IYIHEHAEAAAHAOUHAXIXERUXOHRXLXWXYXWHR*L*W*Y*M*N*NXDXQ*S*SHF*TH/H/XZ*ZHV*DHCH**J*******EYAYOYAWOWUWB*****D*****G*****GX****P*****T*****K*****KX****ULUMUN".match(/.{1,2}/g), D = [
		32768,
		49408,
		49408,
		49408,
		49408,
		164,
		164,
		164,
		164,
		164,
		164,
		132,
		132,
		164,
		164,
		132,
		132,
		132,
		132,
		132,
		132,
		132,
		68,
		4164,
		4164,
		4164,
		4164,
		2124,
		3148,
		2124,
		1096,
		16460,
		9280,
		8256,
		8256,
		9280,
		64,
		64,
		9284,
		8260,
		8260,
		9284,
		8264,
		8256,
		76,
		8260,
		0,
		0,
		180,
		180,
		180,
		148,
		148,
		148,
		78,
		78,
		78,
		1102,
		1102,
		1102,
		78,
		78,
		78,
		78,
		78,
		78,
		75,
		75,
		75,
		1099,
		1099,
		1099,
		75,
		75,
		75,
		75,
		75,
		75,
		128,
		193,
		193
	], i = [
		0,
		4626,
		4626,
		4626,
		2056,
		2824,
		2312,
		2824,
		3592,
		3851,
		2822,
		4108,
		3082,
		1541,
		1541,
		3595,
		3082,
		3594,
		3082,
		2825,
		2056,
		2055,
		2825,
		2567,
		2310,
		2056,
		2054,
		2055,
		2055,
		2055,
		770,
		1285,
		514,
		514,
		514,
		514,
		514,
		514,
		1542,
		1542,
		2055,
		1542,
		1542,
		514,
		2312,
		1027,
		513,
		286,
		3597,
		3852,
		3852,
		3852,
		3598,
		3593,
		2054,
		513,
		514,
		1797,
		513,
		257,
		1798,
		513,
		514,
		1798,
		513,
		514,
		2056,
		514,
		514,
		1540,
		514,
		514,
		1798,
		513,
		1028,
		1798,
		257,
		1028,
		1479,
		1535
	], g = (A, E$1) => {
		var H$1 = e.findIndex((H$2) => H$2 === A + E$1 && "*" !== H$2[1]);
		return -1 !== H$1 && H$1;
	}, B = (A) => {
		var H$1 = e.findIndex((H$2) => H$2 === A + "*");
		return -1 !== H$1 && H$1;
	}, p = (r$1, t$1, O$1) => {
		for (let e$1 = 0; e$1 < r$1.length; e$1++) {
			let H$1 = r$1[e$1], A = r$1[e$1 + 1] || "", E$1;
			if (!1 !== (E$1 = g(H$1, A))) e$1++, t$1(E$1);
			else if (!1 !== (E$1 = B(H$1))) t$1(E$1);
			else {
				for (E$1 = f.length; H$1 !== f[E$1] && 0 < E$1;) --E$1;
				if (0 === E$1) throw Error();
				O$1(E$1);
			}
		}
	}, o = (H$1, A) => Y(D[H$1], A), V = 23, b = 57, w = 69, m = 1, J = 2, y = 8192, k = 4096, Q = 2048, x = 1024, j = 256, a = 128, u = 64, L = 32, $ = 16, _ = 8, s = 4, G = 2, h = 1, q = (E$1, e$1, r$1, t$1) => {
		let H$1 = (H$2, A$1) => {
			switch (H$2) {
				case 53:
					o(r$1(A$1 - 1), x) && e$1(A$1, 16);
					break;
				case 42:
					E$1(A$1 + 1, 43, t$1(A$1));
					break;
				case 44: E$1(A$1 + 1, 45, t$1(A$1));
			}
		}, A = (H$2, A$1) => {
			e$1(H$2, 13), E$1(H$2 + 1, A$1, t$1(H$2));
		}, O$1 = -1, R$1;
		for (; null !== (R$1 = r$1(++O$1));) if (0 !== R$1) if (o(R$1, $)) E$1(O$1 + 1, o(R$1, L) ? 21 : 20, t$1(O$1)), H$1(R$1, O$1);
		else if (78 === R$1) A(O$1, 24);
		else if (79 === R$1) A(O$1, 27);
		else if (80 === R$1) A(O$1, 28);
		else if (o(R$1, a) && t$1(O$1)) 0 === r$1(O$1 + 1) && null !== (R$1 = r$1(O$1 + 2)) && o(R$1, a) && t$1(O$1 + 2) && E$1(O$1 + 2, 31, 0);
		else {
			var I$1, Y$1 = 0 === O$1 ? null : r$1(O$1 - 1);
			if (R$1 === V) switch (Y$1) {
				case w:
					e$1(O$1 - 1, 42);
					break;
				case b:
					e$1(O$1 - 1, 44);
					break;
				default: o(Y$1, a) && e$1(O$1, 18);
			}
			else 24 === R$1 && o(Y$1, a) ? e$1(O$1, 19) : 60 === Y$1 && 32 === R$1 ? e$1(O$1, 38) : 60 === R$1 ? (I$1 = r$1(O$1 + 1), o(I$1, L) || null === I$1 || e$1(O$1, 63)) : (72 === R$1 && (I$1 = r$1(O$1 + 1), o(I$1, L) && null !== I$1 || (e$1(O$1, 75), R$1 = 75)), o(R$1, h) && 32 === Y$1 ? e$1(O$1, R$1 - 12) : o(R$1, h) || H$1(R$1, O$1), 69 !== R$1 && 57 !== R$1 || 0 < O$1 && o(r$1(O$1 - 1), a) && (0 === (R$1 = r$1(O$1 + 1)) && (R$1 = r$1(O$1 + 2)), o(R$1, a)) && !t$1(O$1 + 1) && e$1(O$1, 30));
		}
	}, z = (r$1, t$1, O$1) => {
		for (let H$1 = 0; null !== r$1(H$1); H$1++) if (o(r$1(H$1), j)) {
			for (var A, E$1 = H$1; 1 < --H$1 && !o(r$1(H$1), a););
			if (0 === H$1) break;
			for (; H$1 < E$1; H$1++) o(r$1(H$1), y) && !o(r$1(H$1), s) || (A = O$1(H$1), t$1(H$1, (A >> 1) + A + 1));
		}
		let R$1 = -1, I$1;
		for (; null !== (I$1 = r$1(++R$1));) {
			let H$1 = R$1, A$1, E$2, e$1;
			if (o(I$1, a)) I$1 = r$1(++H$1), o(I$1, u) ? (A$1 = null === I$1 ? u | h : D[I$1], Y(A$1, s) ? (e$1 = O$1(R$1), t$1(R$1, (e$1 >> 2) + e$1 + 1)) : Y(A$1, h) && (E$2 = O$1(R$1), t$1(R$1, E$2 - (E$2 >> 3)))) : 18 !== I$1 && 19 !== I$1 || !o(r$1(++H$1), u) || t$1(R$1, O$1(R$1) - 1);
			else if (o(I$1, Q)) null !== (I$1 = r$1(++H$1)) && o(I$1, G) && (t$1(H$1, 6), t$1(H$1 - 1, 5));
			else if (o(I$1, G)) {
				for (; 0 === (I$1 = r$1(++H$1)););
				null !== I$1 && o(I$1, G) && (t$1(H$1, 1 + (O$1(H$1) >> 1)), t$1(R$1, 1 + (O$1(R$1) >> 1)));
			} else 0 < H$1 && o(I$1, k) && o(r$1(H$1 - 1), G) && t$1(H$1, O$1(H$1) - 2);
		}
	}, H1 = (H$1, A, E$1) => {
		let e$1 = 0;
		for (var r$1; null !== (r$1 = H$1(e$1));) o(r$1, u) && null !== (r$1 = H$1(e$1 + 1)) && o(r$1, a) && 0 !== (r$1 = A(e$1 + 1)) && r$1 < 128 && E$1(e$1, r$1 + 1), ++e$1;
	}, A1 = (H$1, A, E$1) => {
		let e$1 = 0;
		for (var r$1; null !== (r$1 = H$1(e$1));) {
			var t$1 = A(e$1);
			E$1(e$1, 0 === t$1 || 127 < t$1 ? 255 & i[r$1] : i[r$1] >> 8), e$1++;
		}
	}, E1 = (E$1, H$1, A) => {
		let e$1 = -1;
		for (var r$1; null !== (r$1 = E$1(++e$1));) if (o(r$1, G)) {
			if (o(r$1, h)) {
				let H$2, A$1 = e$1;
				for (; 0 === (H$2 = E$1(++A$1)););
				if (null !== H$2 && (o(H$2, _) || 36 === H$2 || 37 === H$2)) continue;
			}
			H$1(e$1 + 1, r$1 + 1, A(e$1), 255 & i[r$1 + 1]), H$1(e$1 + 2, r$1 + 2, A(e$1), 255 & i[r$1 + 2]), e$1 += 2;
		}
	}, e1 = [
		24,
		26,
		23,
		23,
		23
	], r1 = [
		0,
		224,
		230,
		236,
		243,
		249,
		0,
		6,
		12,
		6
	], M = [
		0,
		31,
		31,
		31,
		31,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		2,
		5,
		5,
		2,
		10,
		2,
		8,
		5,
		5,
		11,
		10,
		9,
		8,
		8,
		160,
		8,
		8,
		23,
		31,
		18,
		18,
		18,
		18,
		30,
		30,
		20,
		20,
		20,
		20,
		23,
		23,
		26,
		26,
		29,
		29,
		2,
		2,
		2,
		2,
		2,
		2,
		26,
		29,
		27,
		26,
		29,
		27,
		26,
		29,
		27,
		26,
		29,
		27,
		23,
		29,
		23,
		23,
		29,
		23,
		23,
		29,
		23,
		23,
		29,
		23,
		23,
		23
	], K = [
		0,
		2,
		2,
		2,
		2,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		3,
		2,
		4,
		4,
		2,
		2,
		2,
		2,
		2,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		1,
		2,
		2,
		2,
		1,
		0,
		1,
		0,
		1,
		0,
		5,
		5,
		5,
		5,
		5,
		4,
		4,
		2,
		0,
		1,
		2,
		0,
		1,
		2,
		0,
		1,
		2,
		0,
		1,
		2,
		0,
		2,
		2,
		0,
		1,
		3,
		0,
		2,
		3,
		0,
		2,
		160,
		160
	], C = [
		0,
		2,
		2,
		2,
		2,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		4,
		3,
		3,
		4,
		4,
		3,
		3,
		3,
		3,
		3,
		1,
		2,
		3,
		2,
		1,
		3,
		3,
		3,
		3,
		1,
		1,
		3,
		3,
		3,
		2,
		2,
		3,
		2,
		3,
		0,
		0,
		5,
		5,
		5,
		5,
		4,
		4,
		2,
		0,
		2,
		2,
		0,
		3,
		2,
		0,
		4,
		2,
		0,
		3,
		2,
		0,
		2,
		2,
		0,
		2,
		3,
		0,
		3,
		3,
		0,
		3,
		176,
		160
	], t1 = [
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		241,
		226,
		211,
		187,
		124,
		149,
		1,
		2,
		3,
		3,
		0,
		114,
		0,
		2,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		27,
		0,
		0,
		25,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0
	], O1 = [
		0,
		5980947,
		5980947,
		5980947,
		5980947,
		7230474,
		6113550,
		5980947,
		5783320,
		5842971,
		5712919,
		5775125,
		5383440,
		5844244,
		6113550,
		4075794,
		5383182,
		5774866,
		4076306,
		7218448,
		5250317,
		6112527,
		5904395,
		3944978,
		7216654,
		5904395,
		7230217,
		5320198,
		7943686,
		6641158,
		7943686,
		5980945,
		6506758,
		6967046,
		5315078,
		7946758,
		6113550,
		5383440,
		6107913,
		6767114,
		4990984,
		6106890,
		6639366,
		6639366,
		7946758,
		6639365,
		7958022,
		0,
		5916691,
		5777179,
		5775125,
		5778203,
		5774866,
		5382669,
		5315078,
		5315078,
		5315078,
		7946758,
		7946758,
		7946758,
		7368198,
		7237126,
		7237126,
		6181894,
		6181894,
		6181894,
		5315078,
		5315078,
		5315078,
		7946758,
		7946758,
		7946758,
		6647046,
		6641162,
		7367946,
		6181894,
		6181894,
		6181894,
		556844,
		98067
	], v = [
		0,
		0,
		0,
		0,
		0,
		526861,
		461581,
		527630,
		527887,
		68879,
		68623,
		3087,
		68367,
		2316,
		461581,
		330508,
		68623,
		3087,
		396301,
		67597,
		2061,
		461838,
		2061,
		330252,
		67597,
		2061,
		526861,
		780,
		2313,
		198153,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		779,
		66827,
		779,
		1035,
		0,
		0,
		1,
		66827,
		920064,
		66050,
		593422,
		68879,
		3087,
		68879,
		3087,
		2061,
		2,
		260,
		0,
		2,
		260,
		0,
		1,
		260,
		0,
		1,
		260,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		0,
		461324,
		0,
		0,
		330240,
		0,
		1245199,
		1048591
	], R1 = [
		56,
		132,
		107,
		25,
		198,
		99,
		24,
		134,
		115,
		152,
		198,
		177,
		28,
		202,
		49,
		140,
		199,
		49,
		136,
		194,
		48,
		152,
		70,
		49,
		24,
		198,
		53,
		12,
		202,
		49,
		12,
		198,
		33,
		16,
		36,
		105,
		18,
		194,
		49,
		20,
		196,
		113,
		8,
		74,
		34,
		73,
		171,
		106,
		168,
		172,
		73,
		81,
		50,
		213,
		82,
		136,
		147,
		108,
		148,
		34,
		21,
		84,
		210,
		37,
		150,
		212,
		80,
		165,
		70,
		33,
		8,
		133,
		107,
		24,
		196,
		99,
		16,
		206,
		107,
		24,
		140,
		113,
		25,
		140,
		99,
		53,
		12,
		198,
		51,
		153,
		204,
		108,
		181,
		78,
		162,
		153,
		70,
		33,
		40,
		130,
		149,
		46,
		227,
		48,
		156,
		197,
		48,
		156,
		162,
		177,
		156,
		103,
		49,
		136,
		102,
		89,
		44,
		83,
		24,
		132,
		103,
		80,
		202,
		227,
		10,
		172,
		171,
		48,
		172,
		98,
		48,
		140,
		99,
		16,
		148,
		98,
		177,
		140,
		130,
		40,
		150,
		51,
		152,
		214,
		181,
		76,
		98,
		41,
		165,
		74,
		181,
		156,
		198,
		49,
		20,
		214,
		56,
		156,
		75,
		180,
		134,
		101,
		24,
		174,
		103,
		28,
		166,
		99,
		25,
		150,
		35,
		25,
		132,
		19,
		8,
		166,
		82,
		172,
		202,
		34,
		137,
		110,
		171,
		25,
		140,
		98,
		52,
		196,
		98,
		25,
		134,
		99,
		24,
		196,
		35,
		88,
		214,
		163,
		80,
		66,
		84,
		74,
		173,
		74,
		37,
		17,
		107,
		100,
		137,
		74,
		99,
		57,
		138,
		35,
		49,
		42,
		234,
		162,
		169,
		68,
		197,
		18,
		205,
		66,
		52,
		140,
		98,
		24,
		140,
		99,
		17,
		72,
		102,
		49,
		157,
		68,
		51,
		29,
		70,
		49,
		156,
		198,
		177,
		12,
		205,
		50,
		136,
		196,
		115,
		24,
		134,
		115,
		8,
		214,
		99,
		88,
		7,
		129,
		224,
		240,
		60,
		7,
		135,
		144,
		60,
		124,
		15,
		199,
		192,
		192,
		240,
		124,
		30,
		7,
		128,
		128,
		0,
		28,
		120,
		112,
		241,
		199,
		31,
		192,
		12,
		254,
		28,
		31,
		31,
		14,
		10,
		122,
		192,
		113,
		242,
		131,
		143,
		3,
		15,
		15,
		12,
		0,
		121,
		248,
		97,
		224,
		67,
		15,
		131,
		231,
		24,
		249,
		193,
		19,
		218,
		233,
		99,
		143,
		15,
		131,
		131,
		135,
		195,
		31,
		60,
		112,
		240,
		225,
		225,
		227,
		135,
		184,
		113,
		14,
		32,
		227,
		141,
		72,
		120,
		28,
		147,
		135,
		48,
		225,
		193,
		193,
		228,
		120,
		33,
		131,
		131,
		195,
		135,
		6,
		57,
		229,
		195,
		135,
		7,
		14,
		28,
		28,
		112,
		244,
		113,
		156,
		96,
		54,
		50,
		195,
		30,
		60,
		243,
		143,
		14,
		60,
		112,
		227,
		199,
		143,
		15,
		15,
		14,
		60,
		120,
		240,
		227,
		135,
		6,
		240,
		227,
		7,
		193,
		153,
		135,
		15,
		24,
		120,
		112,
		112,
		252,
		243,
		16,
		177,
		140,
		140,
		49,
		124,
		112,
		225,
		134,
		60,
		100,
		108,
		176,
		225,
		227,
		15,
		35,
		143,
		15,
		30,
		62,
		56,
		60,
		56,
		123,
		143,
		7,
		14,
		60,
		244,
		23,
		30,
		60,
		120,
		242,
		158,
		114,
		73,
		227,
		37,
		54,
		56,
		88,
		57,
		226,
		222,
		60,
		120,
		120,
		225,
		199,
		97,
		225,
		225,
		176,
		240,
		240,
		195,
		199,
		14,
		56,
		192,
		240,
		206,
		115,
		115,
		24,
		52,
		176,
		225,
		199,
		142,
		28,
		60,
		248,
		56,
		240,
		225,
		193,
		139,
		134,
		143,
		28,
		120,
		112,
		240,
		120,
		172,
		177,
		143,
		57,
		49,
		219,
		56,
		97,
		195,
		14,
		14,
		56,
		120,
		115,
		23,
		30,
		57,
		30,
		56,
		100,
		225,
		241,
		193,
		78,
		15,
		64,
		162,
		2,
		197,
		143,
		129,
		161,
		252,
		18,
		8,
		100,
		224,
		60,
		34,
		224,
		69,
		7,
		142,
		12,
		50,
		144,
		240,
		31,
		32,
		73,
		224,
		248,
		12,
		96,
		240,
		23,
		26,
		65,
		170,
		164,
		208,
		141,
		18,
		130,
		30,
		30,
		3,
		248,
		62,
		3,
		12,
		115,
		128,
		112,
		68,
		38,
		3,
		36,
		225,
		62,
		4,
		78,
		4,
		28,
		193,
		9,
		204,
		158,
		144,
		33,
		7,
		144,
		67,
		100,
		192,
		15,
		198,
		144,
		156,
		193,
		91,
		3,
		226,
		29,
		129,
		224,
		94,
		29,
		3,
		132,
		184,
		44,
		15,
		128,
		177,
		131,
		224,
		48,
		65,
		30,
		67,
		137,
		131,
		80,
		252,
		36,
		46,
		19,
		131,
		241,
		124,
		76,
		44,
		201,
		13,
		131,
		176,
		181,
		130,
		228,
		232,
		6,
		156,
		7,
		160,
		153,
		29,
		7,
		62,
		130,
		143,
		112,
		48,
		116,
		64,
		202,
		16,
		228,
		232,
		15,
		146,
		20,
		63,
		6,
		248,
		132,
		136,
		67,
		129,
		10,
		52,
		57,
		65,
		198,
		227,
		28,
		71,
		3,
		176,
		184,
		19,
		10,
		194,
		100,
		248,
		24,
		249,
		96,
		179,
		192,
		101,
		32,
		96,
		166,
		140,
		195,
		129,
		32,
		48,
		38,
		30,
		28,
		56,
		211,
		1,
		176,
		38,
		64,
		244,
		11,
		195,
		66,
		31,
		133,
		50,
		38,
		96,
		64,
		201,
		203,
		1,
		236,
		17,
		40,
		64,
		250,
		4,
		52,
		224,
		112,
		76,
		140,
		29,
		7,
		105,
		3,
		22,
		200,
		4,
		35,
		232,
		198,
		154,
		11,
		26,
		3,
		224,
		118,
		6,
		5,
		207,
		30,
		188,
		88,
		49,
		113,
		102,
		0,
		248,
		63,
		4,
		252,
		12,
		116,
		39,
		138,
		128,
		113,
		194,
		58,
		38,
		6,
		192,
		31,
		5,
		15,
		152,
		64,
		174,
		1,
		127,
		192,
		7,
		255,
		0,
		14,
		254,
		0,
		3,
		223,
		128,
		3,
		239,
		128,
		27,
		241,
		194,
		0,
		231,
		224,
		24,
		252,
		224,
		33,
		252,
		128,
		60,
		252,
		64,
		14,
		126,
		0,
		63,
		62,
		0,
		15,
		254,
		0,
		31,
		255,
		0,
		62,
		240,
		7,
		252,
		0,
		126,
		16,
		63,
		255,
		0,
		63,
		56,
		14,
		124,
		1,
		135,
		12,
		252,
		199,
		0,
		62,
		4,
		15,
		62,
		31,
		15,
		15,
		31,
		15,
		2,
		131,
		135,
		207,
		3,
		135,
		15,
		63,
		192,
		7,
		158,
		96,
		63,
		192,
		3,
		254,
		0,
		63,
		224,
		119,
		225,
		192,
		254,
		224,
		195,
		224,
		1,
		223,
		248,
		3,
		7,
		0,
		126,
		112,
		0,
		124,
		56,
		24,
		254,
		12,
		30,
		120,
		28,
		124,
		62,
		14,
		31,
		30,
		30,
		62,
		0,
		127,
		131,
		7,
		219,
		135,
		131,
		7,
		199,
		7,
		16,
		113,
		255,
		0,
		63,
		226,
		1,
		224,
		193,
		195,
		225,
		0,
		127,
		192,
		5,
		240,
		32,
		248,
		240,
		112,
		254,
		120,
		121,
		248,
		2,
		63,
		12,
		143,
		3,
		15,
		159,
		224,
		193,
		199,
		135,
		3,
		195,
		195,
		176,
		225,
		225,
		193,
		227,
		224,
		113,
		240,
		0,
		252,
		112,
		124,
		12,
		62,
		56,
		14,
		28,
		112,
		195,
		199,
		3,
		129,
		193,
		199,
		231,
		0,
		15,
		199,
		135,
		25,
		9,
		239,
		196,
		51,
		224,
		193,
		252,
		248,
		112,
		240,
		120,
		248,
		240,
		97,
		199,
		0,
		31,
		248,
		1,
		124,
		248,
		240,
		120,
		112,
		60,
		124,
		206,
		14,
		33,
		131,
		207,
		8,
		7,
		143,
		8,
		193,
		135,
		143,
		128,
		199,
		227,
		0,
		7,
		248,
		224,
		239,
		0,
		57,
		247,
		128,
		14,
		248,
		225,
		227,
		248,
		33,
		159,
		192,
		255,
		3,
		248,
		7,
		192,
		31,
		248,
		196,
		4,
		252,
		196,
		193,
		188,
		135,
		240,
		15,
		192,
		127,
		5,
		224,
		37,
		236,
		192,
		62,
		132,
		71,
		240,
		142,
		3,
		248,
		3,
		251,
		192,
		25,
		248,
		7,
		156,
		12,
		23,
		248,
		7,
		224,
		31,
		161,
		252,
		15,
		252,
		1,
		240,
		63,
		0,
		254,
		3,
		240,
		31,
		0,
		253,
		0,
		255,
		136,
		13,
		249,
		1,
		255,
		0,
		112,
		7,
		192,
		62,
		66,
		243,
		13,
		196,
		127,
		128,
		252,
		7,
		240,
		94,
		192,
		63,
		0,
		120,
		63,
		129,
		255,
		1,
		248,
		1,
		195,
		232,
		12,
		228,
		100,
		143,
		228,
		15,
		240,
		7,
		240,
		194,
		31,
		0,
		127,
		192,
		111,
		128,
		126,
		3,
		248,
		7,
		240,
		63,
		192,
		120,
		15,
		130,
		7,
		254,
		34,
		119,
		112,
		2,
		118,
		3,
		254,
		0,
		254,
		103,
		0,
		124,
		199,
		241,
		142,
		198,
		59,
		224,
		63,
		132,
		243,
		25,
		216,
		3,
		153,
		252,
		9,
		184,
		15,
		248,
		0,
		157,
		36,
		97,
		249,
		13,
		0,
		253,
		3,
		240,
		31,
		144,
		63,
		1,
		248,
		31,
		208,
		15,
		248,
		55,
		1,
		248,
		7,
		240,
		15,
		192,
		63,
		0,
		254,
		3,
		248,
		15,
		192,
		63,
		0,
		250,
		3,
		240,
		15,
		128,
		255,
		1,
		184,
		7,
		240,
		1,
		252,
		1,
		188,
		128,
		19,
		30,
		0,
		127,
		225,
		64,
		127,
		160,
		127,
		176,
		0,
		63,
		192,
		31,
		192,
		56,
		15,
		240,
		31,
		128,
		255,
		1,
		252,
		3,
		241,
		126,
		1,
		254,
		1,
		240,
		255,
		0,
		127,
		192,
		29,
		7,
		240,
		15,
		192,
		126,
		6,
		224,
		7,
		224,
		15,
		248,
		6,
		193,
		254,
		1,
		252,
		3,
		224,
		15,
		0,
		252
	], I1 = (A, E$1) => {
		let e$1 = (H$1, A$1) => (H$1 * A$1 >> 8 & 255) << 1, r$1 = [
			[],
			[],
			[]
		];
		O1.map((H$1, A$1) => {
			r$1[0][A$1] = 255 & H$1, r$1[1][A$1] = H$1 >> 8 & 255, r$1[2][A$1] = H$1 >> 16 & 255;
		});
		for (let H$1 = 5; H$1 < 30; H$1++) r$1[0][H$1] = e$1(A, r$1[0][H$1]), r$1[1][H$1] = e$1(E$1, r$1[1][H$1]);
		for (let H$1 = 48; H$1 < 54; H$1++) r$1[0][H$1] = e$1(A, r$1[0][H$1]), r$1[1][H$1] = e$1(E$1, r$1[1][H$1]);
		return r$1;
	}, Y1 = (A, H$1, E$1, e$1) => {
		let Y$1 = [
			A,
			H$1[0],
			H$1[1],
			H$1[2],
			E$1[0],
			E$1[1],
			E$1[2]
		], l$1 = (H$2, A$1) => Y$1[H$2][A$1], r$1 = (A$1, E$2, e$2, H$2) => {
			let r$2 = H$2 < 0, t$2 = Math.abs(H$2) % A$1, O$2 = H$2 / A$1 | 0, R$2 = 0, I$2 = A$1;
			for (; 0 < --I$2;) {
				let H$3 = l$1(E$2, e$2) + O$2;
				(R$2 += t$2) >= A$1 && (R$2 -= A$1, r$2 ? H$3-- : H$3 && H$3++), Y$1[E$2][++e$2] = H$3, H$3 += O$2;
			}
		}, t$1, O$1, R$1 = 0;
		for (let H$2 = 0; H$2 < e$1.length - 1; H$2++) {
			var I$1 = e$1[H$2][0], U$1 = e$1[H$2 + 1][0], n$1 = M[U$1], N$1 = M[I$1], W$1 = (O$1 = N$1 === n$1 ? (t$1 = K[I$1], K[U$1]) : N$1 < n$1 ? (t$1 = C[U$1], K[U$1]) : (t$1 = K[I$1], C[I$1]), (R$1 += e$1[H$2][1]) + O$1), S$1 = R$1 - t$1, T$1 = t$1 + O$1;
			if (0 == (T$1 - 2 & 128)) {
				r$1((N$1 = e$1[H$2][1] >> 1) + (n$1 = e$1[H$2 + 1][1] >> 1), 0, S$1, A[R$1 + n$1] - A[R$1 - N$1]);
				for (let H$3 = 1; H$3 < 7; H$3++) {
					var f$1 = l$1(H$3, W$1) - l$1(H$3, S$1);
					r$1(T$1, H$3, S$1, f$1);
				}
			}
		}
		return R$1 + e$1[e$1.length - 1][1];
	}, l1 = 255, U1 = 1, n1 = (E$1, e$1, r$1) => {
		let H$1 = (H$2, A, E$2) => {
			var e$2 = A;
			A < 30 ? A = 0 : A -= 30;
			let r$2;
			for (; 127 === (r$2 = E$2[A]);) ++A;
			for (; A !== e$2;) for (r$2 += H$2, E$2[A] = 255 & r$2; ++A !== e$2 && 255 === E$2[A];);
		}, t$1 = [], O$1 = [
			[],
			[],
			[]
		], R$1 = [
			[],
			[],
			[]
		], I$1 = [], Y$1 = 0;
		for (let A = 0; A < e$1.length; A++) {
			var l$1 = e$1[A][0], U$1 = (l$1 === m ? H$1(U1, Y$1, t$1) : l$1 === J && H$1(l1, Y$1, t$1), r1[e$1[A][2]]);
			for (let H$2 = e$1[A][1]; 0 < H$2; H$2--) O$1[0][Y$1] = r$1[0][l$1], O$1[1][Y$1] = r$1[1][l$1], O$1[2][Y$1] = r$1[2][l$1], R$1[0][Y$1] = 255 & v[l$1], R$1[1][Y$1] = v[l$1] >> 8 & 255, R$1[2][Y$1] = v[l$1] >> 16 & 255, I$1[Y$1] = t1[l$1], t$1[Y$1] = E$1 + U$1 & 255, Y$1++;
		}
		return [
			t$1,
			O$1,
			R$1,
			I$1
		];
	}, N1 = (H$1, A, E$1, e$1, r$1) => {
		var E$1 = I1(E$1, e$1), [t$1, O$1, R$1, e$1] = n1(A, H$1, E$1), A = Y1(t$1, O$1, R$1, H$1);
		if (!r$1) for (let H$2 = 0; H$2 < t$1.length; H$2++) t$1[H$2] -= O$1[0][H$2] >> 1;
		var I$1 = [
			0,
			1,
			2,
			2,
			2,
			3,
			3,
			4,
			4,
			5,
			6,
			8,
			9,
			11,
			13,
			15
		];
		for (let H$2 = R$1[0].length - 1; 0 <= H$2; H$2--) R$1[0][H$2] = I$1[R$1[0][H$2]], R$1[1][H$2] = I$1[R$1[1][H$2]], R$1[2][H$2] = I$1[R$1[2][H$2]];
		return [
			A,
			O$1,
			t$1,
			R$1,
			e$1
		];
	}, W1 = (H$1) => {
		let E$1 = new Uint8Array(H$1), e$1 = 0, r$1 = 0, t$1 = (H$2, A) => {
			A = 16 * (15 & A), t$1.ary(H$2, [
				A,
				A,
				A,
				A,
				A
			]);
		};
		return t$1.ary = (H$2, A) => {
			if (((e$1 += [
				[
					162,
					167,
					167,
					127,
					128
				],
				[
					226,
					60,
					60,
					0,
					0
				],
				[
					225,
					60,
					59,
					0,
					0
				],
				[
					200,
					0,
					0,
					54,
					55
				],
				[
					199,
					0,
					0,
					54,
					54
				]
			][r$1][H$2]) / 50 | 0) > E$1.length) throw new Error();
			r$1 = H$2;
			for (let H$3 = 0; H$3 < 5; H$3++) E$1[(e$1 / 50 | 0) + H$3] = A[H$3];
		}, t$1.get = () => E$1.slice(0, e$1 / 50 | 0), t$1;
	}, X = (O$1, A, H$1, E$1) => {
		let e$1 = (7 & H$1) - 1, R$1 = 256 * e$1 & 65535, I$1 = 248 & H$1, r$1 = (H$2, A$1, E$2, e$2) => {
			let r$2 = 8, t$2 = R1[R$1 + I$1];
			for (; 0 != (128 & t$2) ? O$1(H$2, A$1) : O$1(E$2, e$2), t$2 <<= 1, --r$2;);
		};
		if (0 === I$1) {
			let H$2 = E$1 >> 4 ^ 255;
			for (I$1 = 255 & A; r$1(3, 26, 4, 6), I$1++, I$1 &= 255, 255 & ++H$2;);
			return I$1;
		}
		I$1 ^= 255;
		for (var t$1 = 255 & e1[e$1]; r$1(2, 5, 1, t$1), 255 & ++I$1;);
		return A;
	}, c = (H$1) => 127 * Math.sin(2 * Math.PI * (H$1 / 256)) | 0, S1 = (H$1, A, E$1, t$1, e$1, O$1, r$1) => {
		let R$1 = E$1, I$1 = 0, Y$1 = 0, l$1 = 0, U$1 = 0, n$1 = 0, N$1 = e$1[0], W$1 = .75 * N$1 | 0;
		for (; A;) {
			var S$1 = r$1[n$1];
			if (0 != (248 & S$1)) U$1 = X(H$1, U$1, S$1, e$1[255 & n$1]), n$1 += 2, A -= 2, R$1 = E$1;
			else {
				{
					let A$1 = [], E$2 = 256 * I$1, e$2 = 256 * Y$1, r$2 = 256 * l$1;
					for (let H$2 = 0; H$2 < 5; H$2++) {
						var T$1 = c(255 & E$2 >> 8), f$1 = c(255 & e$2 >> 8), D$1 = (255 & r$2 >> 8) < 129 ? -112 : 112, T$1 = (T$1 * (15 & O$1[0][n$1]) + f$1 * (15 & O$1[1][n$1]) + D$1 * (15 & O$1[2][n$1])) / 32 + 128;
						A$1[H$2] = 0 | T$1, E$2 += 256 * t$1[0][n$1] / 4, e$2 += 256 * t$1[1][n$1] / 4, r$2 += 256 * t$1[2][n$1] / 4;
					}
					H$1.ary(0, A$1);
				}
				if (0 == --R$1) {
					if (n$1++, 0 == --A) return;
					R$1 = E$1;
				}
				if (0 != --N$1) {
					if (0 != --W$1 || 0 === S$1) {
						I$1 += t$1[0][n$1], Y$1 += t$1[1][n$1], l$1 += t$1[2][n$1];
						continue;
					}
					U$1 = X(H$1, U$1, S$1, e$1[255 & n$1]);
				}
			}
			N$1 = e$1[n$1], W$1 = .75 * N$1 | 0, I$1 = 0, Y$1 = 0, l$1 = 0;
		}
	};
	function d(H$1) {
		var A, E$1, e$1, r$1, t$1, O$1 = 1 < arguments.length && void 0 !== arguments[1] ? arguments[1] : {}, H$1 = ((H$2) => {
			if (!H$2) return !1;
			let A$1 = (H$3) => H$3 === I$1.length ? null : I$1[H$3], E$2 = (A$2, H$3, E$3, e$3) => {
				for (let H$4 = I$1.length - 1; H$4 >= A$2; H$4--) I$1[H$4 + 1] = I$1[H$4], R$1[H$4 + 1] = t$2(H$4), O$2[H$4 + 1] = r$2(H$4);
				I$1[A$2] = H$3, R$1[A$2] = 0 | e$3, O$2[A$2] = E$3;
			}, r$2 = (H$3) => 0 | O$2[H$3], t$2 = (H$3) => 0 | R$1[H$3], e$2 = (H$3, A$2) => {
				R$1[H$3] = A$2;
			}, O$2 = [], R$1 = [], I$1 = [], Y$1 = 0;
			return p(H$2, (H$3) => {
				O$2[Y$1] = 0, R$1[Y$1] = 0, I$1[Y$1++] = H$3;
			}, (H$3) => {
				O$2[Y$1 - 1] = H$3;
			}), q(E$2, (H$3, A$2) => {
				I$1[H$3] = A$2;
			}, A$1, r$2), H1(A$1, r$2, (H$3, A$2) => {
				O$2[H$3] = A$2;
			}), A1(A$1, r$2, e$2), z(A$1, e$2, t$2), E1(A$1, E$2, r$2), I$1.map((H$3, A$2) => H$3 ? [
				H$3,
				0 | R$1[A$2],
				0 | O$2[A$2]
			] : null).filter((H$3) => H$3);
		})(H$1);
		return !1 !== H$1 && (r$1 = void 0 === (r$1 = O$1.pitch) ? 64 : 255 & r$1, E$1 = void 0 === (E$1 = O$1.mouth) ? 128 : 255 & E$1, e$1 = void 0 === (e$1 = O$1.throat) ? 128 : 255 & e$1, A = 255 & (O$1.speed || 72), O$1 = O$1.singmode || !1, r$1 = N1(H$1, r$1, E$1, e$1, O$1), E$1 = W1(176.4 * H$1.reduce((H$2, A$1) => H$2 + A$1[1], 0) * A | 0), [e$1, O$1, H$1, r$1, t$1] = r$1, S1(E$1, e$1, A, O$1, H$1, r$1, t$1), E$1.get());
	}
	let F = (H$1) => {
		let A = " " + H$1.toUpperCase(), E$1 = 0, e$1 = "", r$1 = (H$2, A$1) => {
			E$1 += A$1, e$1 += H$2;
		}, t$1 = 0;
		for (; E$1 < A.length && t$1++ < 1e4;) {
			var O$1 = A[E$1];
			if ("." !== O$1 || N(A, E$1 + 1, 1)) if (n(O$1, 2)) T.some((H$2) => H$2(A, E$1, r$1));
			else if (0 !== l[O$1]) {
				if (!n(O$1, U)) return !1;
				S[O$1].some((H$2) => H$2(A, E$1, r$1));
			} else e$1 += " ", E$1++;
			else e$1 += ".", E$1++;
		}
		return e$1;
	}, Z = d, P = (H$1, A) => {
		if (!1 === (H$1 = d(H$1, A))) return !1;
		var E$1 = H$1, e$1 = new Float32Array(E$1.length);
		for (let H$2 = 0; H$2 < E$1.length; H$2++) e$1[H$2] = (E$1[H$2] - 128) / 256;
		return e$1;
	};
	function H(H$1) {
		let E$1 = H$1 || {}, e$1 = (H$2, A) => A || E$1.phonetic ? H$2.toUpperCase() : F(H$2);
		this.buf8 = (H$2, A) => Z(e$1(H$2, A), E$1), this.buf32 = (H$2, A) => P(e$1(H$2, A), E$1), this.speak = (A, H$2) => {
			if (A = this.buf32(A, H$2), I = null === I ? new AudioContext() : I) {
				var O$1 = I, R$1 = A;
				let t$1, H$3 = new Promise((H$4, A$1) => {
					let E$2 = O$1.createBufferSource(), e$2 = O$1.createBuffer(1, R$1.length, 22050), r$1 = e$2.getChannelData(0);
					for (let H$5 = 0; H$5 < R$1.length; H$5++) r$1[H$5] = R$1[H$5];
					E$2.buffer = e$2, E$2.connect(O$1.destination), E$2.onended = () => {
						H$4(!0);
					}, t$1 = (H$5) => {
						E$2.disconnect(), A$1(H$5);
					}, E$2.start(0);
				});
				return H$3.abort = t$1, H$3;
			}
			throw new Error();
		}, this.download = (H$2, A) => {
			var E$2, H$2 = this.buf8(H$2, A), A = new Blob([R(H$2)], { type: "audio/vnd.wave" }), A = (H$2 = window.URL || window.webkitURL).createObjectURL(A);
			(E$2 = document.createElement("a")).href = A, E$2.target = "_blank", E$2.download = "sam.wav", document.body.appendChild(E$2), E$2.click(), document.body.removeChild(E$2), H$2.revokeObjectURL(A);
		}, this.wav = (H$2, A) => R(this.buf8(H$2, A));
	}
	H.buf8 = Z, H.buf32 = P, H.convert = F;
	const SCALE_INTERVALS = {
		major: [
			0,
			2,
			4,
			5,
			7,
			9,
			11
		],
		minor: [
			0,
			2,
			3,
			5,
			7,
			8,
			10
		],
		pentatonic: [
			0,
			3,
			5,
			7,
			10
		],
		pent: [
			0,
			3,
			5,
			7,
			10
		],
		minorpentatonic: [
			0,
			3,
			5,
			7,
			10
		],
		minorpent: [
			0,
			3,
			5,
			7,
			10
		],
		majorpentatonic: [
			0,
			2,
			4,
			7,
			9
		],
		majorpent: [
			0,
			2,
			4,
			7,
			9
		],
		ritusen: [
			0,
			2,
			4,
			6,
			9
		],
		kumai: [
			0,
			2,
			3,
			7,
			9
		],
		hirajoshi: [
			0,
			2,
			3,
			7,
			8
		],
		iwato: [
			0,
			1,
			5,
			6,
			10
		],
		chinese: [
			0,
			4,
			6,
			7,
			11
		],
		indian: [
			0,
			4,
			5,
			7,
			9,
			11
		],
		pelog: [
			0,
			1,
			3,
			7,
			8
		],
		prometheus: [
			0,
			2,
			4,
			6,
			9,
			10
		],
		scriabin: [
			0,
			1,
			4,
			7,
			9
		],
		gong: [
			0,
			2,
			4,
			7,
			9
		],
		shang: [
			0,
			2,
			5,
			7,
			10
		],
		jiao: [
			0,
			3,
			5,
			8,
			10
		],
		zhi: [
			0,
			2,
			4,
			6,
			9
		],
		yu: [
			0,
			3,
			5,
			7,
			9
		],
		whole: [
			0,
			2,
			4,
			6,
			8,
			10
		],
		wholetone: [
			0,
			2,
			4,
			6,
			8,
			10
		],
		augmented: [
			0,
			3,
			4,
			7,
			8,
			11
		],
		augmented2: [
			0,
			1,
			4,
			5,
			8,
			9
		],
		hexmajor7: [
			0,
			2,
			4,
			7,
			9,
			11
		],
		hexdorian: [
			0,
			2,
			3,
			5,
			7,
			9
		],
		hexphrygian: [
			0,
			1,
			4,
			5,
			7,
			10
		],
		hexsus: [
			0,
			2,
			5,
			7,
			9,
			10
		],
		hexmajor6: [
			0,
			2,
			4,
			5,
			7,
			9
		],
		hexaeolian: [
			0,
			2,
			3,
			5,
			7,
			8
		],
		ionian: [
			0,
			2,
			4,
			5,
			7,
			9,
			11
		],
		dorian: [
			0,
			2,
			3,
			5,
			7,
			9,
			10
		],
		phrygian: [
			0,
			1,
			3,
			5,
			7,
			8,
			10
		],
		lydian: [
			0,
			2,
			4,
			6,
			7,
			9,
			11
		],
		mixolydian: [
			0,
			2,
			4,
			5,
			7,
			9,
			10
		],
		aeolian: [
			0,
			2,
			3,
			5,
			7,
			8,
			10
		],
		locrian: [
			0,
			1,
			3,
			5,
			6,
			8,
			10
		],
		harmonicminor: [
			0,
			2,
			3,
			5,
			7,
			8,
			11
		],
		harmonicmajor: [
			0,
			2,
			4,
			5,
			7,
			8,
			11
		],
		melodicminor: [
			0,
			2,
			3,
			5,
			7,
			9,
			11
		],
		melodicminordesc: [
			0,
			2,
			3,
			5,
			7,
			8,
			10
		],
		melodicmajor: [
			0,
			2,
			4,
			6,
			7,
			9,
			11
		],
		bartok: [
			0,
			2,
			4,
			5,
			7,
			8,
			10
		],
		hindu: [
			0,
			2,
			5,
			7,
			8,
			10
		],
		todi: [
			0,
			1,
			3,
			6,
			7,
			8,
			11
		],
		purvi: [
			0,
			1,
			4,
			6,
			7,
			8,
			11
		],
		marva: [
			0,
			1,
			4,
			6,
			7,
			9,
			11
		],
		bhairav: [
			0,
			1,
			4,
			5,
			7,
			8,
			11
		],
		ahirbhairav: [
			0,
			1,
			4,
			5,
			7,
			9,
			10
		],
		superlocrian: [
			0,
			1,
			3,
			4,
			6,
			8,
			10
		],
		romanianminor: [
			0,
			2,
			3,
			6,
			7,
			9,
			10
		],
		hungarianminor: [
			0,
			2,
			3,
			6,
			7,
			8,
			11
		],
		neapolitanminor: [
			0,
			1,
			3,
			5,
			7,
			8,
			11
		],
		enigmatic: [
			0,
			1,
			4,
			6,
			8,
			10,
			11
		],
		spanish: [
			0,
			1,
			3,
			4,
			5,
			7,
			8,
			10
		],
		leadingwhole: [
			0,
			2,
			4,
			6,
			8,
			9,
			11
		],
		lydianminor: [
			0,
			2,
			4,
			6,
			7,
			8,
			10
		],
		neapolitanmajor: [
			0,
			1,
			3,
			5,
			7,
			9,
			11
		],
		locrianmajor: [
			0,
			2,
			4,
			5,
			6,
			8,
			10
		],
		diminished: [
			0,
			2,
			3,
			5,
			6,
			8,
			9,
			11
		],
		octatonic: [
			0,
			1,
			3,
			4,
			6,
			7,
			9,
			10
		],
		diminished2: [
			0,
			1,
			3,
			4,
			6,
			7,
			9,
			10
		],
		octatonic2: [
			0,
			2,
			3,
			5,
			6,
			8,
			9,
			11
		],
		messiaen1: [
			0,
			2,
			4,
			6,
			8,
			10
		],
		messiaen2: [
			0,
			1,
			2,
			5,
			6,
			7,
			10,
			11
		],
		messiaen3: [
			0,
			2,
			3,
			4,
			6,
			7,
			8,
			11
		],
		messiaen4: [
			0,
			1,
			2,
			5,
			6,
			7,
			9,
			10
		],
		messiaen5: [
			0,
			1,
			5,
			6,
			7,
			11
		],
		messiaen6: [
			0,
			2,
			4,
			5,
			6,
			8,
			10,
			11
		],
		messiaen7: [
			0,
			1,
			2,
			3,
			5,
			6,
			7,
			8,
			9,
			11
		],
		chromatic: [
			0,
			1,
			2,
			3,
			4,
			5,
			6,
			7,
			8,
			9,
			10,
			11
		],
		bayati: [
			0,
			1,
			4,
			5,
			7,
			8,
			10
		],
		hijaz: [
			0,
			1,
			4,
			5,
			7,
			8,
			10
		],
		sikah: [
			0,
			1,
			4,
			5,
			7,
			8,
			10
		],
		rast: [
			0,
			2,
			4,
			5,
			7,
			9,
			10
		],
		saba: [
			0,
			1,
			3,
			4,
			6,
			7,
			9,
			10
		],
		iraq: [
			0,
			1,
			4,
			5,
			7,
			8,
			10
		]
	};
	const SCALE_KEY_TO_INDEX = {};
	{
		const sigToIndex = /* @__PURE__ */ new Map();
		let next = 0;
		for (const [name, intervals] of Object.entries(SCALE_INTERVALS)) {
			const sig = intervals.join(",");
			let idx = sigToIndex.get(sig);
			if (idx === void 0) {
				idx = next++;
				sigToIndex.set(sig, idx);
			}
			SCALE_KEY_TO_INDEX[name] = idx;
		}
	}
	const SCALE_INDEX_TO_INTERVALS = [];
	{
		const seen = /* @__PURE__ */ new Set();
		for (const [name, intervals] of Object.entries(SCALE_INTERVALS)) {
			const idx = SCALE_KEY_TO_INDEX[name];
			if (idx !== void 0 && !seen.has(idx)) {
				seen.add(idx);
				SCALE_INDEX_TO_INTERVALS[idx] = intervals;
			}
		}
	}
	const SYSTEM_VARS = new Set([
		"t",
		"samplesPerBeat",
		"samplesPerBar",
		"co",
		"undefined"
	]);
	Array.from(SYSTEM_VARS);
	AudioVmOp.Add, AudioVmOp.Sub, AudioVmOp.Mul, AudioVmOp.Div, AudioVmOp.Mod, AudioVmOp.Pow, AudioVmOp.BitAnd, AudioVmOp.BitOr, AudioVmOp.BitXor, AudioVmOp.ShiftLeft, AudioVmOp.ShiftRight;
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
	const hashScratchF32 = new Float32Array(1);
	new Uint32Array(hashScratchF32.buffer);
	const numRe = "[+-]?(?:\\d+(?:\\.\\d*)?|\\.\\d+)";
	`${numRe}${numRe}${numRe}`;
	const GEN_KEY_SEP = "\0";
	const primaryGenNameByVariantName = Object.create(null);
	const primarySpecByGenKey = Object.create(null);
	const opCodeByGenKey = Object.create(null);
	const paramHasByGenKey = Object.create(null);
	const defaultsByGenName = Object.create(null);
	AudioVmOp.IsUndefined, AudioVmOp.IsScalar, AudioVmOp.IsAudio, AudioVmOp.IsArray, AudioVmOp.IsFunction;
	for (const [genName, desc] of Object.entries(gens)) {
		const out = Object.create(null);
		for (const p$1 of desc.parameters) if (p$1.default !== void 0) out[p$1.name] = p$1.default;
		defaultsByGenName[genName] = out;
	}
	for (const s$1 of genSpecs) {
		if (!(s$1.variantName in primaryGenNameByVariantName)) primaryGenNameByVariantName[s$1.variantName] = s$1.genName;
		const key = `${s$1.genName}${GEN_KEY_SEP}${s$1.variantName}`;
		if (key in primarySpecByGenKey) continue;
		primarySpecByGenKey[key] = s$1;
		const has = Object.create(null);
		for (const pn of s$1.paramNames) has[pn] = true;
		paramHasByGenKey[key] = has;
		const opCode = AudioVmOp[`Gen${s$1.genName}_${s$1.variantName}`];
		if (opCode !== void 0) opCodeByGenKey[key] = opCode;
	}
	function disassembleBytecode(bytecode, indent = 0) {
		const lines = [];
		const u32 = new Uint32Array(bytecode.buffer, bytecode.byteOffset, bytecode.length);
		let pc = 0;
		const pad = "  ".repeat(indent);
		while (pc < bytecode.length) {
			const opcode = u32[pc];
			const info = getOpcodeInfo(opcode);
			const name = AudioVmOp[opcode] ?? `Unknown(${opcode})`;
			const here = pc++;
			switch (info.kind) {
				case "param":
				case "pc-param": {
					const param = Math.round(bytecode[pc]);
					const suffix = name === "CallFunction" ? ` arg(s)` : "";
					lines.push(`${pad}${here}: ${name} ${param}${suffix}`);
					pc++;
					break;
				}
				case "three-param":
					lines.push(`${pad}${here}: ${name} ${Math.round(bytecode[pc])} ${Math.round(bytecode[pc + 1])} ${Math.round(bytecode[pc + 2])}`);
					pc += 3;
					break;
				case "table": {
					const len = Math.round(bytecode[pc]);
					lines.push(`${pad}${here}: ${name} len=${len}`);
					pc += 1 + len;
					break;
				}
				case "define-function": {
					const id = Math.round(bytecode[pc]);
					const paramCount = Math.round(bytecode[pc + 1]);
					const firstParamIn = Math.round(bytecode[pc + 2]);
					const closureCount = Math.round(bytecode[pc + 3]);
					const localCount = Math.round(bytecode[pc + 4]);
					const len = Math.round(bytecode[pc + 5]);
					lines.push(`${pad}${here}: ${name} id=${id} paramCount=${paramCount} firstParamIn=${firstParamIn} closureCount=${closureCount} localCount=${localCount} len=${len}`);
					pc += 6;
					lines.push(...disassembleBytecode(bytecode.subarray(pc, pc + len), indent + 1));
					pc += len;
					break;
				}
				case "none":
					lines.push(`${pad}${here}: ${name}`);
					break;
			}
		}
		return lines;
	}
	function hashF32Bits(arr) {
		const u32 = new Uint32Array(arr.buffer, arr.byteOffset, arr.byteLength / 4 | 0);
		let hash = 0;
		for (let i$1 = 0; i$1 < u32.length; i$1++) hash = hash * 31 + (u32[i$1] ?? 0) | 0;
		return hash;
	}
	function computeCapturedValuesHash(mainBytecode, scopeId, numDeps) {
		let hash = hashF32Bits(mainBytecode);
		hash = hash * 31 + scopeId | 0;
		hash = hash * 31 + numDeps | 0;
		return hash;
	}
	function getCapturedValuesFromCaptureStore(opts) {
		const { core: core$1, mainBytecode, captureStoreGlobalIdx, numDeps, defaultParamRecordGlobals, recordGlobalIndices, sampleRate, tempVmId = 0, bpm = 120, callbackId = 0, useNestedCaptureStore = false } = opts;
		const mainPtr = core$1.wasm.createFloat32Buffer(mainBytecode.length) >>> 0;
		new Float32Array(core$1.memory.buffer, mainPtr, mainBytecode.length).set(mainBytecode);
		core$1.wasm.resetAudioVmAt(tempVmId);
		const nyquist = sampleRate / 2;
		core$1.wasm.runAudioVmAt(tempVmId, mainPtr, mainBytecode.length, 128, 0, sampleRate, nyquist, Math.PI / nyquist, bpm);
		const capturedValues = [];
		const skipIndices = /* @__PURE__ */ new Set();
		const undefinedRecordGlobals = /* @__PURE__ */ new Set();
		if (defaultParamRecordGlobals?.length) recordGlobalIndices.forEach((recordGlobalIdx, i$1) => {
			if (defaultParamRecordGlobals.includes(recordGlobalIdx)) skipIndices.add(i$1);
		});
		for (let i$1 = 0; i$1 < numDeps; i$1++) {
			const recordGlobalIdx = recordGlobalIndices[i$1];
			const isUndefined = useNestedCaptureStore ? core$1.wasm.getAudioVmNestedArrayElementIsUndefined(tempVmId, captureStoreGlobalIdx, callbackId, i$1) : core$1.wasm.getAudioVmArrayElementIsUndefined(tempVmId, captureStoreGlobalIdx, i$1);
			const value = useNestedCaptureStore ? core$1.wasm.getAudioVmNestedArrayElementAt(tempVmId, captureStoreGlobalIdx, callbackId, i$1) : core$1.wasm.getAudioVmArrayElementAt(tempVmId, captureStoreGlobalIdx, i$1);
			const treatAsUndefined = isUndefined || Number.isNaN(value);
			if (treatAsUndefined) undefinedRecordGlobals.add(recordGlobalIdx);
			capturedValues.push(skipIndices.has(i$1) ? 0 : treatAsUndefined ? 0 : value);
		}
		core$1.wasm.freeFloat32Buffer(mainPtr);
		const invalidIdx = capturedValues.findIndex((v$1, i$1) => !skipIndices.has(i$1) && Number.isNaN(v$1));
		if (invalidIdx >= 0) throw new Error(`Invalid capture at index ${invalidIdx}: captured variable is not a scalar (e.g. was reassigned to a function or array).`);
		return {
			capturedValues,
			undefinedRecordGlobals
		};
	}
	function findMaxRecordGlobalIdx(recordGlobalIndices) {
		let maxRecordGlobalIdx = -1;
		for (const recordGlobalIdx of recordGlobalIndices) if (recordGlobalIdx > maxRecordGlobalIdx) maxRecordGlobalIdx = recordGlobalIdx;
		return maxRecordGlobalIdx;
	}
	function preSizeGlobalsArray(core$1, minSize) {
		if (minSize <= 0) return;
		core$1.wasm.ensureSampleRecordGlobalsSize(minSize);
	}
	function setCapturedValues(core$1, recordGlobalIndices, capturedValues, skipRecordGlobals, recordVmId) {
		for (let i$1 = 0; i$1 < recordGlobalIndices.length; i$1++) {
			const recordGlobalIdx = recordGlobalIndices[i$1];
			if (skipRecordGlobals.has(recordGlobalIdx)) continue;
			const value = capturedValues[i$1] ?? 0;
			core$1.wasm.setSampleRecordGlobal(recordGlobalIdx, value);
		}
	}
	function initializeSampleRecord(core$1, setupBytecode, loopBytecode, numSamples, sampleRate) {
		const setupPtr = core$1.wasm.createFloat32Buffer(setupBytecode.length) >>> 0;
		new Float32Array(core$1.memory.buffer, setupPtr, setupBytecode.length).set(setupBytecode);
		const loopPtr = core$1.wasm.createFloat32Buffer(loopBytecode.length) >>> 0;
		new Float32Array(core$1.memory.buffer, loopPtr, loopBytecode.length).set(loopBytecode);
		core$1.wasm.initSampleRecord(setupPtr, setupBytecode.length, loopPtr, loopBytecode.length, numSamples, sampleRate);
		core$1.wasm.freeFloat32Buffer(setupPtr);
		core$1.wasm.freeFloat32Buffer(loopPtr);
	}
	function runRecordSetup(core$1) {
		core$1.wasm.runSampleRecordSetup();
	}
	function executeRecordLoop(core$1) {
		core$1.wasm.recordSampleAll();
	}
	function extractRecordOutput(core$1, numSamples) {
		const outputPtr = core$1.wasm.getSampleRecordOutputPtr() >>> 0;
		const output = new Float32Array(numSamples);
		const wasmOutput = new Float32Array(core$1.memory.buffer, outputPtr, numSamples);
		output.set(wasmOutput);
		return output;
	}
	function executeRecordCallbackWithSampleRecord(opts) {
		const { core: core$1, setupBytecode, loopBytecode, recordGlobalIndices, capturedValues, defaultParamRecordGlobals, undefinedRecordGlobals, maxSetupGlobalIndex, numSamples, sampleRate } = opts;
		initializeSampleRecord(core$1, setupBytecode, loopBytecode, numSamples, sampleRate);
		const maxRecordGlobalIdx = findMaxRecordGlobalIdx(recordGlobalIndices);
		preSizeGlobalsArray(core$1, Math.max(maxRecordGlobalIdx, opts.maxSetupGlobalIndex ?? -1) + 1);
		setCapturedValues(core$1, recordGlobalIndices, capturedValues, new Set(undefinedRecordGlobals ?? []), 1);
		runRecordSetup(core$1);
		executeRecordLoop(core$1);
		return extractRecordOutput(core$1, numSamples);
	}
	function processRecordRequest(opts) {
		const { core: core$1, recordRequest, recordCallbacks, mainBytecode, sampleRate = 48e3, bpm = 120, tempVmId = 0 } = opts;
		const { seconds, callbackId } = recordRequest;
		const callbackData = recordCallbacks.get(callbackId);
		if (!callbackData) return null;
		const { setup: setupBytecode, loop: loopBytecode, captureStoreGlobalIdx, recordGlobalIndices, defaultParamRecordGlobals, maxSetupGlobalIndex } = callbackData;
		const numSamples = Math.floor(seconds * sampleRate);
		const numDeps = recordGlobalIndices.length;
		try {
			const { capturedValues, undefinedRecordGlobals } = getCapturedValuesFromCaptureStore({
				core: core$1,
				mainBytecode,
				captureStoreGlobalIdx,
				numDeps,
				defaultParamRecordGlobals,
				recordGlobalIndices,
				sampleRate,
				tempVmId,
				bpm,
				callbackId,
				useNestedCaptureStore: callbackData.useNestedCaptureStore
			});
			return {
				output: executeRecordCallbackWithSampleRecord({
					core: core$1,
					setupBytecode,
					loopBytecode,
					recordGlobalIndices,
					capturedValues,
					defaultParamRecordGlobals,
					undefinedRecordGlobals,
					maxSetupGlobalIndex,
					numSamples,
					sampleRate
				}),
				capturedValues
			};
		} catch (error) {
			console.groupCollapsed("Main bytecode");
			console.log(disassembleBytecode(mainBytecode).join("\n"));
			console.groupEnd();
			throw error;
		}
	}
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
	function untrack(id) {
		allocations.delete(id);
	}
	function getSnapshot() {
		const byCategory = {};
		let totalBytes = 0;
		const entries = Array.from(allocations.values());
		for (const a$1 of entries) {
			const cat = ensureCategory(byCategory, a$1.category);
			cat.count += 1;
			cat.bytes += a$1.bytes;
			totalBytes += a$1.bytes;
			const src = a$1.meta?.source ?? "unknown";
			addToBySource(cat.bySource, src, a$1.bytes);
		}
		return {
			allocations: entries,
			byCategory,
			totalBytes
		};
	}
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
	const section = "sourceMappingURL";
	function read_uint(buf, pos = 0) {
		let n$1 = 0;
		let shift = 0;
		let b$1 = buf[pos];
		let outpos = pos + 1;
		while (b$1 >= 128) {
			n$1 = n$1 | b$1 - 128 << shift;
			b$1 = buf[outpos];
			outpos++;
			shift += 7;
		}
		return [n$1 + (b$1 << shift), outpos];
	}
	function encode_uint(n$1) {
		let result = [];
		while (n$1 > 127) {
			result.push(128 | n$1 & 127);
			n$1 = n$1 >> 7;
		}
		result.push(n$1);
		return new Uint8Array(result);
	}
	function ab2str(buf) {
		let str = "";
		let bytes = new Uint8Array(buf);
		for (let i$1 = 0; i$1 < bytes.length; i$1++) str += String.fromCharCode(bytes[i$1]);
		return str;
	}
	function str2ab(str) {
		let bytes = new Uint8Array(str.length);
		for (let i$1 = 0; i$1 < str.length; i$1++) bytes[i$1] = str[i$1].charCodeAt(0);
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
			const [sec_start, _$1, uri_start] = findSection(buf, section);
			if (sec_start == -1) return null;
			const [uri_len, uri_pos] = read_uint(buf, uri_start);
			return ab2str(buf.slice(uri_pos, uri_pos + uri_len));
		},
		removeSourceMapURL: function(buf) {
			buf = new Uint8Array(buf);
			const [sec_start, sec_size, _$1] = findSection(buf, section);
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
		if (extraImports) for (const k$1 of Object.keys(extraImports)) {
			const mod$1 = extraImports[k$1];
			if (!mod$1) continue;
			importObject[k$1] = {
				...importObject[k$1],
				...mod$1
			};
		}
		return {
			wasm: (await WebAssembly.instantiate(mod, importObject)).exports,
			memory
		};
	}
	let core = null;
	let worklet = null;
	let capturedValuesCache = null;
	var RecordWorker = class {
		sourcemapUrl = "";
		sampleSyncPort = null;
		constructor(sampleSyncPort) {
			this.sampleSyncPort = sampleSyncPort ?? null;
		}
		async loadWasm(binary, opts) {
			this.sourcemapUrl = opts.sourcemapUrl;
			core = await wasmSetup({
				binary,
				sourcemapUrl: this.sourcemapUrl,
				config: opts.config,
				imports: ({ memory }) => createWasmImports(memory)
			});
		}
		async getMemoryInfo() {
			const wasmMemoryMb = core?.wasm?.memoryUsage ? core.wasm.memoryUsage() / 1024 / 1024 : void 0;
			return {
				snapshot: getSnapshot(),
				wasmMemoryMb
			};
		}
		async connectWorklet(port) {
			worklet = rpc(port);
			port.start();
		}
		async getCapturedValues(opts) {
			if (!core) throw new Error("Recording WASM core not initialized");
			const { mainBytecode, scopeId, captureStoreGlobalIdx, numDeps, recordGlobalIndices, defaultParamRecordGlobals, sampleRate } = opts;
			const hash = computeCapturedValuesHash(mainBytecode, scopeId, numDeps);
			if (capturedValuesCache && capturedValuesCache.hash === hash) return capturedValuesCache.values;
			const { capturedValues } = getCapturedValuesFromCaptureStore({
				core,
				mainBytecode,
				captureStoreGlobalIdx,
				numDeps,
				recordGlobalIndices,
				defaultParamRecordGlobals,
				sampleRate,
				tempVmId: 0,
				bpm: 120,
				callbackId: scopeId,
				useNestedCaptureStore: true
			});
			core.wasm.__collect();
			capturedValuesCache = {
				hash,
				values: capturedValues
			};
			return capturedValues;
		}
		async recordAndSend(opts) {
			if (!core) throw new Error("Recording WASM core not initialized");
			if (!worklet) throw new Error("Worklet not connected");
			const { handle, mainBytecode, setupBytecode, loopBytecode, captureStoreGlobalIdx, recordGlobalIndices, defaultParamRecordGlobals, callbackId, useNestedCaptureStore = true, numSamples, sampleRate } = opts;
			try {
				const recordCallbacks = new Map([[callbackId, {
					setup: setupBytecode,
					loop: loopBytecode,
					dependencies: [],
					recordGlobalIndices,
					captureStoreGlobalIdx,
					defaultParamRecordGlobals,
					useNestedCaptureStore
				}]]);
				const recordResult = processRecordRequest({
					core,
					recordRequest: {
						seconds: numSamples / sampleRate,
						callbackId
					},
					recordCallbacks,
					mainBytecode,
					sampleRate,
					bpm: 120,
					tempVmId: 0
				});
				if (!recordResult) throw new Error("Record failed: invalid capture state.");
				untrack(`sab-record-${handle}`);
				const bytes = numSamples * 4;
				track(`sab-record-${handle}`, "SharedArrayBuffer", bytes, {
					source: "record-worker:recordAndSend",
					handle
				});
				const sharedOutput = new Float32Array(new SharedArrayBuffer(bytes));
				sharedOutput.set(recordResult.output);
				await worklet.setSampleDataDirect({
					handle,
					channels: [sharedOutput],
					sampleRate
				});
				this.sampleSyncPort?.postMessage({
					type: "sampleDataSync",
					handle,
					channels: [sharedOutput.buffer],
					sampleRate
				});
				return recordResult.capturedValues;
			} catch (error) {
				console.error(error);
				const errorMsg = error instanceof Error ? error.message : String(error);
				await worklet.setSampleErrorDirect({
					handle,
					error: errorMsg
				});
				this.sampleSyncPort?.postMessage({
					type: "sampleErrorSync",
					handle,
					error: errorMsg
				});
				throw error;
			} finally {
				core.wasm.__collect();
			}
		}
	};
	self.onmessage = (e$1) => {
		if (e$1.data?.type === "init" && e$1.data.port) {
			const port = e$1.data.port;
			const sampleSyncPort = e$1.data.sampleSyncPort;
			rpc(port, new RecordWorker(sampleSyncPort));
			port.start();
		}
	};
})();

//# sourceMappingURL=record-worker-CzIUO-ey.js.map