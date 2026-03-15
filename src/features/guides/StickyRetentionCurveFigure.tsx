import { Box } from "@mantine/core";

export function StickyRetentionCurveFigure() {
  return (
    <Box
      component="figure"
      m={0}
      style={{
        marginInline: "auto",
        width: "100%",
        maxWidth: 980,
      }}
    >
      <svg
        viewBox="0 0 1024 668"
        role="img"
        aria-labelledby="sticky-retention-title sticky-retention-desc"
        style={{
          width: "100%",
          height: "auto",
          display: "block",
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        <title id="sticky-retention-title">Sticky retention curve diagram</title>
        <desc id="sticky-retention-desc">
          A Sticky-branded version of a spaced repetition diagram showing retention dropping, then rising after review
          at expanding intervals to improve long-term memory.
        </desc>

        <defs>
          <marker
            id="sticky-green-arrow"
            viewBox="0 0 12 12"
            refX="6"
            refY="6"
            markerWidth="10"
            markerHeight="10"
            orient="auto-start-reverse"
          >
            <path d="M 1 1 L 11 6 L 1 11 z" fill="#82d62a" />
          </marker>
        </defs>

        <rect x="0" y="0" width="1024" height="668" fill="#fbfaf6" />

        <line x1="76" y1="505" x2="936" y2="505" stroke="#d6c565" strokeWidth="4.5" />
        <line x1="106" y1="66" x2="106" y2="540" stroke="#d6c565" strokeWidth="4.5" />

        <text
          x="68"
          y="312"
          fill="#5f5f5f"
          fontSize="27"
          fontWeight="500"
          transform="rotate(-90 68 312)"
          textAnchor="middle"
        >
          Probability to remember
        </text>

        <text
          x="556"
          y="594"
          fill="#5f5f5f"
          fontSize="30"
          fontWeight="500"
          textAnchor="middle"
        >
          Review intervals
        </text>

        <path
          d="M 197 154
             C 228 184, 244 224, 270 278
             C 307 352, 352 422, 404 463
             C 447 496, 498 504, 548 505
             L 913 505"
          fill="none"
          stroke="#cb764b"
          strokeWidth="3.2"
          strokeDasharray="11 8"
          strokeLinecap="round"
        />

        <path
          d="M 197 154
             L 197 154
             C 226 181, 248 209, 270 246
             L 270 154
             C 323 188, 369 225, 404 258
             L 404 154
             C 475 188, 534 221, 601 256
             L 601 154
             C 683 188, 742 214, 864 258
             L 864 154
             C 886 170, 900 182, 924 198"
          fill="none"
          stroke="#cb764b"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <path
          d="M 270 246
             C 309 286, 339 325, 381 365
             C 425 407, 474 438, 532 465
             C 563 479, 588 483, 604 483"
          fill="none"
          stroke="#cb764b"
          strokeWidth="3.2"
          strokeDasharray="11 8"
          strokeLinecap="round"
        />

        <path
          d="M 404 258
             C 449 294, 486 332, 526 349
             C 560 364, 590 372, 612 372
             L 918 372"
          fill="none"
          stroke="#cb764b"
          strokeWidth="3.2"
          strokeDasharray="11 8"
          strokeLinecap="round"
        />

        <path
          d="M 601 256
             C 651 281, 707 292, 752 292
             L 924 292"
          fill="none"
          stroke="#cb764b"
          strokeWidth="3.2"
          strokeDasharray="11 8"
          strokeLinecap="round"
        />

        <circle cx="197" cy="154" r="7.5" fill="#b86a42" />
        <line x1="197" y1="154" x2="197" y2="505" stroke="#c68d17" strokeWidth="2.4" strokeDasharray="6 5" />

        <line x1="270" y1="154" x2="270" y2="505" stroke="#d0a527" strokeWidth="2.4" />
        <line x1="404" y1="154" x2="404" y2="505" stroke="#d0a527" strokeWidth="2.4" />
        <line x1="601" y1="154" x2="601" y2="505" stroke="#d0a527" strokeWidth="2.4" />
        <line x1="864" y1="154" x2="864" y2="505" stroke="#d0a527" strokeWidth="2.4" />

        <line x1="270" y1="110" x2="270" y2="84" stroke="#82d62a" strokeWidth="2.5" markerEnd="url(#sticky-green-arrow)" />
        <line x1="404" y1="110" x2="404" y2="84" stroke="#82d62a" strokeWidth="2.5" markerEnd="url(#sticky-green-arrow)" />
        <line x1="601" y1="110" x2="601" y2="84" stroke="#82d62a" strokeWidth="2.5" markerEnd="url(#sticky-green-arrow)" />
        <line x1="864" y1="110" x2="864" y2="84" stroke="#82d62a" strokeWidth="2.5" markerEnd="url(#sticky-green-arrow)" />

        <text x="116" y="88" fill="#6a6a6a" fontSize="22">Learn something</text>
        <path
          d="M 158 96
             C 143 107, 142 121, 156 129
             C 174 139, 189 142, 196 156"
          fill="none"
          stroke="#6a6a6a"
          strokeWidth="2.1"
          markerEnd="url(#sticky-green-arrow)"
          opacity="0.82"
        />

        <text x="440" y="397" fill="#cb764b" fontSize="21">Forgetting curve</text>
        <path
          d="M 490 392
             C 498 382, 508 378, 522 380
             C 533 382, 542 387, 547 394"
          fill="none"
          stroke="#cb764b"
          strokeWidth="2.1"
          opacity="0.82"
        />

        <line x1="968" y1="424" x2="968" y2="246" stroke="#48a92b" strokeWidth="2.5" markerEnd="url(#sticky-green-arrow)" />
        <text x="930" y="446" fill="#48a92b" fontSize="22">Improve</text>
        <text x="922" y="472" fill="#48a92b" fontSize="22">long-term</text>
        <text x="932" y="498" fill="#48a92b" fontSize="22">memory</text>

        <text x="176" y="538" fill="#555555" fontSize="18" fontWeight="600">Day 0</text>
        <text x="248" y="538" fill="#555555" fontSize="18" fontWeight="600">Day 2</text>
        <text x="378" y="538" fill="#555555" fontSize="18" fontWeight="600">Day 10</text>
        <text x="575" y="538" fill="#555555" fontSize="18" fontWeight="600">Day 30</text>
        <text x="840" y="538" fill="#555555" fontSize="18" fontWeight="600">Day 60</text>
      </svg>
    </Box>
  );
}
