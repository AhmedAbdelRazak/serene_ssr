import React, { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";

export default function SVGChild({
	backArmRotate,
	backLegRotate,
	frontArmRotate,
	frontLegRotate,
	frontFacing,
	isTalking,
	talkFrame,
	showFinalMessage,
}) {
	// --- EYE BLINKING STATE & EFFECT ---
	const [blinkFrame, setBlinkFrame] = useState(0);

	useEffect(() => {
		// Blink every 2 seconds, hold 200ms
		const interval = setInterval(() => {
			setBlinkFrame(1);
			const timeout = setTimeout(() => {
				setBlinkFrame(0);
			}, 200);
			return () => clearTimeout(timeout);
		}, 2000);

		return () => clearInterval(interval);
	}, []);

	// --- 1) MOUTH RENDERING ---
	const renderMouthFront = () => {
		/**
		 * talkFrame meanings:
		 *   0 => closed smile
		 *   1 => open (talking)
		 *   2 => big toothy grin (original final grin)
		 *   3 => [NEW] smaller toothy smile
		 */
		if (talkFrame === 1) {
			// open
			return <path d='M65 61 Q70 64 75 61 Q70 67 65 61' fill='#000' />;
		} else if (talkFrame === 2) {
			// big toothy grin (existing)
			return (
				<>
					<path
						d='M65 61 Q70 68 75 61'
						stroke='#fff'
						strokeWidth='2'
						fill='transparent'
					/>
					<path
						d='M65 61 Q70 68 75 61'
						stroke='#000'
						strokeWidth='1.5'
						fill='transparent'
					/>
				</>
			);
		} else if (talkFrame === 3) {
			// [NEW] smaller grin with teeth
			return (
				<>
					<path
						d='M66 62 Q70 65 74 62'
						stroke='#fff'
						strokeWidth='1'
						fill='transparent'
					/>
					<path
						d='M66 62 Q70 65 74 62'
						stroke='#000'
						strokeWidth='1'
						fill='transparent'
					/>
				</>
			);
		}
		// default closed smile
		return (
			<path
				d='M65 61 Q70 65 75 61'
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
			/>
		);
	};

	const renderMouthSide = () => {
		/**
		 * talkFrame meanings:
		 *   0 => closed curve
		 *   1 => open side mouth
		 *   2 => big grin
		 *   3 => smaller toothy grin
		 */
		if (talkFrame === 1) {
			// open side mouth
			return (
				<path
					d='M68 56 C70 60, 72 60, 74 56'
					stroke='#000'
					strokeWidth='1.5'
					fill='transparent'
				/>
			);
		} else if (talkFrame === 2) {
			// big grin
			return (
				<path
					d='M66 57 C68 62, 74 62, 76 57'
					stroke='#000'
					strokeWidth='1.5'
					fill='transparent'
				/>
			);
		} else if (talkFrame === 3) {
			// smaller grin with teeth
			return (
				<>
					<path
						d='M67 57 C69 60, 73 60, 75 57'
						stroke='#fff'
						strokeWidth='1'
						fill='transparent'
					/>
					<path
						d='M67 57 C69 60, 73 60, 75 57'
						stroke='#000'
						strokeWidth='1'
						fill='transparent'
					/>
				</>
			);
		}
		// default small curve
		return (
			<path
				d='M68 57 Q70 59 72 57'
				stroke='#000'
				strokeWidth='1'
				fill='transparent'
			/>
		);
	};

	// --- EYES RENDERING ---
	const renderEyesFront = () => {
		if (blinkFrame === 1) {
			// eyes closed: short lines
			return (
				<>
					<path d='M64 54 L68 54' stroke='#333' strokeWidth='2' />
					<path d='M72 54 L76 54' stroke='#333' strokeWidth='2' />
				</>
			);
		} else {
			// eyes open
			return (
				<>
					<circle cx='66' cy='54' r='1.8' fill='#333' />
					<circle cx='74' cy='54' r='1.8' fill='#333' />
				</>
			);
		}
	};

	const renderEyesSide = () => {
		if (blinkFrame === 1) {
			// closed (line)
			return <path d='M70 54 L74 54' stroke='#333' strokeWidth='2' />;
		} else {
			// open (one iris)
			return <circle cx='72' cy='54' r='1.2' fill='#333' />;
		}
	};

	// --- 2) SPEECH BUBBLE MEASUREMENT ---
	const greetingRef = useRef(null);
	const finalRef = useRef(null);

	const [greetingBBox, setGreetingBBox] = useState({ width: 130, height: 60 });
	const [finalBBox, setFinalBBox] = useState({ width: 130, height: 60 });

	// Just a helper to measure & store bounding box
	const measureGreeting = () => {
		if (greetingRef.current) {
			const bbox = greetingRef.current.getBBox();
			setGreetingBBox({ width: bbox.width, height: bbox.height });
		}
	};
	const measureFinal = () => {
		if (finalRef.current) {
			const bbox = finalRef.current.getBBox();
			setFinalBBox({ width: bbox.width, height: bbox.height });
		}
	};

	// Measure them once at mount
	useEffect(() => {
		measureGreeting();
		measureFinal();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// We'll compute the bubble path from whichever text is "active" right now
	const activeBBox = showFinalMessage ? finalBBox : greetingBBox;

	// Create the bubble path
	function getBubblePath(w, h) {
		const padding = 10;
		const bubbleWidth = w + padding * 2;
		const bubbleHeight = h + padding * 2;
		const tailX = 20;
		const tailTipX = 10;
		const tailTipY = bubbleHeight + 15;

		return `
      M0 0
      H${bubbleWidth}
      Q${bubbleWidth + 5} 0 ${bubbleWidth + 5} 5
      V${bubbleHeight}
      Q${bubbleWidth + 5} ${bubbleHeight + 5} ${bubbleWidth} ${bubbleHeight + 5}
      H${tailX}
      L${tailTipX} ${tailTipY}
      Z
    `;
	}

	const dynamicPath = getBubblePath(activeBBox.width, activeBBox.height);

	// Tail anchor at character's mouth ~ y=60
	const arrowY = 60;
	const padding = 10;
	const bubbleHeight = activeBBox.height + padding * 2;
	const bubbleOffsetY = arrowY - (bubbleHeight + 15);
	const bubbleOffsetX = 80;

	// --- 3) SPEECH BUBBLE RENDER ---
	const renderSpeechBubble = () => {
		if (!isTalking) return null;

		return (
			<g transform={`translate(${bubbleOffsetX}, ${bubbleOffsetY})`}>
				<motion.path
					fill='#fff'
					stroke='#000'
					strokeWidth='0.2'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, d: dynamicPath }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
				/>

				{/* GREETING TEXT */}
				<motion.g
					ref={greetingRef}
					initial={{ opacity: 1 }}
					animate={{ opacity: showFinalMessage ? 0 : 1 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					onUpdate={measureGreeting}
					onAnimationComplete={measureGreeting}
				>
					<text
						x='10'
						y='20'
						fontSize='12'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						Hi there,
					</text>
					<text
						x='10'
						y='36'
						fontSize='12'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						My name is Jake.
					</text>
					<text
						x='10'
						y='52'
						fontSize='12'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						Great to have you here! 🤗
					</text>
				</motion.g>

				{/* FINAL TEXT */}
				<motion.g
					ref={finalRef}
					initial={{ opacity: 0 }}
					animate={{ opacity: showFinalMessage ? 1 : 0 }}
					transition={{ duration: 0.5, ease: "easeInOut" }}
					onUpdate={measureFinal}
					onAnimationComplete={measureFinal}
				>
					<text
						x='10'
						y='20'
						fontSize='12'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						Click here to have an idea! 💡
					</text>
					<text
						x='10'
						y='36'
						fontSize='12'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						A gift that will never be forgettable! 🎁
					</text>
				</motion.g>
			</g>
		);
	};

	// --- 4) MAIN RENDER (FRONT-FACING or SIDE-VIEW) ---
	if (frontFacing) {
		return (
			<svg
				width='140'
				height='200'
				viewBox='0 0 140 200'
				style={{ overflow: "visible" }}
			>
				{/* HEAD */}
				<ellipse cx='70' cy='55' rx='10' ry='12' fill='#f1c27d' />
				<path
					d='M64 44 C66 39, 74 39, 76 44 C76 46, 64 46, 64 44'
					fill='#3c2e2d'
				/>
				<ellipse cx='60' cy='55' rx='2' ry='3' fill='#f1c27d' />
				<ellipse cx='80' cy='55' rx='2' ry='3' fill='#f1c27d' />

				{/* EYES */}
				{renderEyesFront()}

				{/* Nose */}
				<path
					d='M69 57 L71 57 L70 59 Z'
					fill='#f1c27d'
					stroke='#333'
					strokeWidth='0.5'
				/>

				{/* MOUTH */}
				{renderMouthFront()}

				{/* Neck */}
				<rect x='69' y='66' width='2' height='6' fill='#f1c27d' />

				{/* TORSO */}
				<path
					d='
            M60 72
            C 60 64, 80 64, 80 72
            L 80 110
            C 80 116, 60 116, 60 110
            Z
          '
					fill='#4B8BBE'
				/>
				<circle cx='70' cy='82' r='1.5' fill='#fff' />
				<circle cx='70' cy='90' r='1.5' fill='#fff' />
				<circle cx='70' cy='98' r='1.5' fill='#fff' />

				{/* ARMS */}
				<path
					d='
            M60 76
            C 58 78, 58 85, 58 90
            L58 97
            C58 102, 60 106, 63 106
            C61 107, 60 109, 60 111
            C58 113, 64 113, 64 111
            C66 109, 65 107, 63 106
            L63 76
            Z
          '
					fill='#f1c27d'
				/>
				<path
					d='
            M80 76
            C 82 78, 82 85, 82 90
            L82 97
            C82 102, 80 106, 77 106
            C79 107, 80 109, 80 111
            C82 113, 76 113, 76 111
            C74 109, 75 107, 77 106
            L77 76
            Z
          '
					fill='#f1c27d'
				/>

				{/* LEGS */}
				<rect x='65' y='110' width='5' height='30' rx='2' fill='#333' />
				<rect x='70' y='110' width='5' height='30' rx='2' fill='#333' />

				{/* Speech Bubble */}
				{renderSpeechBubble()}
			</svg>
		);
	} else {
		// SIDE VIEW
		return (
			<svg
				width='140'
				height='200'
				viewBox='0 0 140 200'
				style={{ overflow: "visible" }}
			>
				{/* HEAD */}
				<ellipse cx='70' cy='55' rx='9' ry='11' fill='#f1c27d' />
				<path
					d='M65 46 C67 42, 73 42, 75 46 C75 48, 65 48, 65 46'
					fill='#3c2e2d'
				/>
				<ellipse cx='63' cy='55' rx='1.5' ry='2.5' fill='#f1c27d' />

				{/* EYE (side) */}
				{renderEyesSide()}

				{/* MOUTH (side) */}
				{renderMouthSide()}

				{/* Neck */}
				<rect x='69' y='66' width='2' height='6' fill='#f1c27d' />

				{/* TORSO */}
				<path
					d='
            M64 72
            C 64 64, 76 64, 76 72
            L 76 110
            C 76 116, 64 116, 64 110
            Z
          '
					fill='#4B8BBE'
				/>

				{/* BACK ARM */}
				<path
					d='
            M76 72
            C 77 74, 77 76, 76 78
            L76 94
            C76 99, 78 103, 81 103
            C79 104, 78 106, 78 108
            C76 110, 82 110, 82 108
            C84 106, 83 104, 81 103
            L81 72
            Z
          '
					fill='#f1c27d'
					style={{
						transformOrigin: "76px 72px",
						transform: `rotate(${backArmRotate}deg)`,
					}}
				/>

				{/* BACK LEG */}
				<rect
					x='72'
					y='110'
					width='5'
					height='30'
					rx='2'
					fill='#333'
					style={{
						transformOrigin: "72px 110px",
						transform: `rotate(${backLegRotate}deg)`,
					}}
				/>

				{/* FRONT ARM */}
				<path
					d='
            M64 72
            C 63 74, 63 76, 64 78
            L64 94
            C64 99, 62 103, 59 103
            C61 104, 62 106, 62 108
            C64 110, 58 110, 58 108
            C56 106, 57 104, 59 103
            L59 72
            Z
          '
					fill='#f1c27d'
					style={{
						transformOrigin: "64px 72px",
						transform: `rotate(${frontArmRotate}deg)`,
					}}
				/>

				{/* FRONT LEG */}
				<rect
					x='66'
					y='110'
					width='5'
					height='30'
					rx='2'
					fill='#333'
					style={{
						transformOrigin: "66px 110px",
						transform: `rotate(${frontLegRotate}deg)`,
					}}
				/>

				{/* Speech Bubble */}
				{renderSpeechBubble()}
			</svg>
		);
	}
}
