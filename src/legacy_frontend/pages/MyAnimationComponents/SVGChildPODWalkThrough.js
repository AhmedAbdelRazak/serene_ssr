import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * PROPS:
 *   frameIndex => number (0..3=walk, 4=stand, 5=point)
 *   bubbleText => string
 *   bubbleButtons => array of strings or null
 *   bubbleUI => any node or null
 *   isMobile => bool
 *   onBubbleButtonClick(label) => function
 *   shouldFadeOut => bool
 *
 *   // NEW:
 *   bubbleTextStyle => optional style object (for fade-out or other transitions)
 */

export default function SVGChildPODWalkThrough({
	frameIndex,
	bubbleText,
	bubbleButtons,
	bubbleUI,
	isMobile,
	onBubbleButtonClick,
	shouldFadeOut,
	bubbleTextStyle = {}, // <-- ADDED
}) {
	// mouth “talk” animation
	const [talkFrame, setTalkFrame] = useState(0);
	useEffect(() => {
		if (bubbleText || (bubbleButtons && bubbleButtons.length) || bubbleUI) {
			setTalkFrame(1);
			const t = setTimeout(() => setTalkFrame(0), 1500);
			return () => clearTimeout(t);
		} else {
			setTalkFrame(0);
		}
	}, [bubbleText, bubbleButtons, bubbleUI]);

	// eyes blink
	const [blinkFrame, setBlinkFrame] = useState(0);
	useEffect(() => {
		const blinkTimer = setInterval(() => {
			setBlinkFrame(1);
			setTimeout(() => setBlinkFrame(0), 120);
		}, 2000);
		return () => clearInterval(blinkTimer);
	}, []);

	// character arm/leg frames
	const framesData = [
		{ backArm: -10, frontArm: 10, backLeg: 20, frontLeg: -20, offsetX: 0 },
		{ backArm: 10, frontArm: -10, backLeg: -5, frontLeg: 5, offsetX: 5 },
		{ backArm: -10, frontArm: 10, backLeg: 20, frontLeg: -20, offsetX: 10 },
		{ backArm: 10, frontArm: -10, backLeg: -5, frontLeg: 5, offsetX: 15 },
		// 4 => stand => arms by side
		{ backArm: -140, frontArm: 0, backLeg: 0, frontLeg: 0, offsetX: 20 },
		// 5 => point => left arm ~ -40
		{ backArm: -40, frontArm: 0, backLeg: 0, frontLeg: 0, offsetX: 20 },
	];

	// Slightly simpler walking for mobile
	if (isMobile) {
		framesData[2] = framesData[1];
		framesData[3] = framesData[1];
	}
	const pose = framesData[frameIndex] || framesData[4];
	const { backArm, frontArm, backLeg, frontLeg, offsetX } = pose;

	function renderEyes() {
		if (blinkFrame === 1) {
			return (
				<>
					<line x1='64' y1='54' x2='68' y2='54' stroke='#333' strokeWidth='2' />
					<line x1='72' y1='54' x2='76' y2='54' stroke='#333' strokeWidth='2' />
				</>
			);
		}
		return (
			<>
				<circle cx='66' cy='54' r='1.8' fill='#333' />
				<circle cx='74' cy='54' r='1.8' fill='#333' />
			</>
		);
	}

	function renderMouth() {
		if (talkFrame === 1) {
			// “talking” shape
			return <path d='M65 61 Q70 64 75 61 Q70 67 65 61' fill='#000' />;
		}
		// normal closed mouth
		return (
			<path
				d='M65 61 Q70 65 75 61'
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
			/>
		);
	}

	// speech bubble bounding box
	const bubbleRef = useRef(null);
	const [bubbleBBox, setBubbleBBox] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (bubbleRef.current) {
			const box = bubbleRef.current.getBBox();
			setBubbleBBox({ width: box.width, height: box.height });
		}
	}, [bubbleText, bubbleButtons, bubbleUI, bubbleTextStyle]); // <-- watch textStyle too

	function getBubblePath(w, h) {
		const pad = 10;
		const tail = 12;
		const totalW = w + pad * 2;
		const totalH = h + pad * 2;
		return `
      M0,${totalH / 2}
      L${tail},0
      H${totalW}
      Q${totalW + 5} 0, ${totalW + 5} 5
      V${totalH - 5}
      Q${totalW + 5} ${totalH} ${totalW} ${totalH}
      H${tail}
      L0,${totalH / 2}
      Z
    `;
	}

	const hasBubble =
		bubbleText || (bubbleButtons && bubbleButtons.length) || bubbleUI;
	const bubblePath = getBubblePath(bubbleBBox.width, bubbleBBox.height);

	function renderBubble() {
		if (!hasBubble) return null;
		return (
			<g transform='translate(180,80)'>
				{/* Outer bubble shape */}
				<motion.path
					fill='#fff'
					stroke='#ccc'
					strokeWidth='1'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, d: bubblePath }}
					transition={{ duration: 0.3 }}
				/>

				{/* The text/UI inside */}
				<g ref={bubbleRef} transform='translate(15,15)'>
					{/* Render bubble text */}
					{bubbleText && (
						<text
							x='0'
							y='0'
							fontSize='14'
							fill='#000'
							dy='1em'
							style={bubbleTextStyle} // <-- Use the style from the parent
						>
							{bubbleText}
						</text>
					)}

					{/* Render bubble UI if present */}
					{bubbleUI && (
						<foreignObject
							x='0'
							y={bubbleText ? 40 : 0}
							width='220'
							height='140'
							style={{ overflow: "visible" }}
						>
							<div xmlns='http://www.w3.org/1999/xhtml'>{bubbleUI}</div>
						</foreignObject>
					)}

					{/* Render bubble buttons if present */}
					{bubbleButtons && bubbleButtons.length > 0 && (
						<foreignObject
							x='0'
							y={bubbleText || bubbleUI ? 30 : 0}
							width='220'
							height='60'
							style={{ overflow: "visible" }}
						>
							<div
								style={{
									display: "flex",
									gap: "8px",
									flexWrap: "wrap",
									marginTop: "4px",
									marginLeft: "10px",
								}}
								xmlns='http://www.w3.org/1999/xhtml'
							>
								{bubbleButtons.map((btn) => (
									<button
										key={btn}
										style={{
											padding: "4px 8px",
											cursor: "pointer",
											background: "#666",
											color: "white",
											borderRadius: "4px",
											border: "none",
										}}
										onClick={() => onBubbleButtonClick(btn)}
									>
										{btn}
									</button>
								))}
							</div>
						</foreignObject>
					)}
				</g>
			</g>
		);
	}

	return (
		<AnimatePresence>
			{/* If shouldFadeOut is true, we fade out the entire SVG */}
			{!shouldFadeOut && (
				<motion.svg
					key='character'
					width='300'
					height='290'
					viewBox='20 -100 300 320'
					style={{ overflow: "visible" }}
					initial={{ opacity: 1 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0, transition: { duration: 1 } }}
				>
					{/* Character Body */}
					<g transform='translate(70,140)'>
						<g
							style={{
								transformOrigin: "0 0",
								transform: `translate(${offsetX}px, 0)`,
								transition: "transform 0.25s",
							}}
						>
							{/* LEFT ARM => backArm */}
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
								style={{
									transformOrigin: "80px 76px",
									transform: `rotate(${backArm}deg)`,
									transition: "transform 0.25s",
								}}
							/>
							{/* LEFT LEG => backLeg */}
							<rect
								x='70'
								y='110'
								width='5'
								height='30'
								rx='2'
								fill='#333'
								style={{
									transformOrigin: "70px 110px",
									transform: `rotate(${backLeg}deg)`,
									transition: "transform 0.25s",
								}}
							/>
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
							{/* Some extra details on torso */}
							<circle cx='70' cy='82' r='1.5' fill='#fff' />
							<circle cx='70' cy='90' r='1.5' fill='#fff' />
							<circle cx='70' cy='98' r='1.5' fill='#fff' />

							{/* RIGHT ARM => frontArm */}
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
								style={{
									transformOrigin: "60px 76px",
									transform: `rotate(${frontArm}deg)`,
									transition: "transform 0.25s",
								}}
							/>
							{/* RIGHT LEG => frontLeg */}
							<rect
								x='65'
								y='110'
								width='5'
								height='30'
								rx='2'
								fill='#333'
								style={{
									transformOrigin: "65px 110px",
									transform: `rotate(${frontLeg}deg)`,
									transition: "transform 0.25s",
								}}
							/>

							{/* HEAD */}
							<g style={{ transformOrigin: "70px 55px", transition: "0.25s" }}>
								<ellipse cx='70' cy='55' rx='10' ry='12' fill='#f1c27d' />

								{/* Hair */}
								<path
									d={`
                    M${70 - 6} ${55 - 11}
                    C ${70 - 4} ${55 - 16},
                      ${70 + 4} ${55 - 16},
                      ${70 + 6} ${55 - 11}
                    C ${70 + 6} ${55 - 9},
                      ${70 - 6} ${55 - 9},
                      ${70 - 6} ${55 - 11}
                  `}
									fill='#3c2e2d'
								/>

								{/* Eyes */}
								{renderEyes()}

								{/* Nose */}
								<path
									d='M69 57 L71 57 L70 59'
									fill='#f1c27d'
									stroke='#333'
									strokeWidth='0.5'
								/>

								{/* Mouth */}
								{renderMouth()}
							</g>
						</g>
					</g>

					{/* Speech Bubble */}
					{renderBubble()}
				</motion.svg>
			)}
		</AnimatePresence>
	);
}
