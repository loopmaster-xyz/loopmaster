(function() {
	function tokenizeLine(line) {
		return [...line.matchAll(/\s+|.+/g)].filter((x) => x[0] !== "").map((text) => ({
			text: text[0],
			type: "text"
		}));
	}
	self.onmessage = (event) => {
		const message = event.data;
		if (!message || message.type !== "tokenizeChunk") return;
		const tokenLines = message.lines.map(tokenizeLine);
		const response = {
			type: "tokenizeChunkResult",
			jobId: message.jobId,
			revision: message.revision,
			startLine: message.startLine,
			tokenLines
		};
		self.postMessage(response);
	};
})();

//# sourceMappingURL=tokenizer-worker-k12IpgVT.js.map