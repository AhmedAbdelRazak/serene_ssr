import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function SVGChildWalkingGreeting({
	frameIndex,
	showBubble,
	showFinalMessage,
	isTalking,
	talkFrame,
}) {
	// BLINK
	const [blinkFrame, setBlinkFrame] = useState(0);
	useEffect(() => {
		const blinkInterval = setInterval(() => {
			setBlinkFrame(1);
			// revert blink after 150ms
			setTimeout(() => setBlinkFrame(0), 150);
		}, 2000);
		return () => clearInterval(blinkInterval);
	}, []);

	/**
	 * FRAMES:
	 *  0..3 => walking steps
	 *  4    => final stand
	 *  5    => final stand + left (back) arm pointing
	 *
	 *  13..16 => "YES" jump frames
	 *  17..19 => "NO" shrug frames
	 */
	const framesData = [
		{
			// 0: walk step #1
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -10,
			frontArm: 10,
			backLeg: 20,
			frontLeg: -20,
			torsoRotate: 0,
			offsetX: 5,
			offsetY: 0,
			scale: 0.8,
		},
		{
			// 1: walk step #2
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 10,
			frontArm: -10,
			backLeg: -10,
			frontLeg: 10,
			torsoRotate: 0,
			offsetX: 10,
			offsetY: 0,
			scale: 0.85,
		},
		{
			// 2: walk step #3
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -15,
			frontArm: 15,
			backLeg: 15,
			frontLeg: -15,
			torsoRotate: 0,
			offsetX: 15,
			offsetY: 0,
			scale: 0.9,
		},
		{
			// 3: walk step #4
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 15,
			frontArm: -15,
			backLeg: -5,
			frontLeg: 5,
			torsoRotate: 0,
			offsetX: 20,
			offsetY: 0,
			scale: 0.95,
		},
		{
			// 4: final stand
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
		},
		{
			// 5: final stand + back arm pointing
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -45, // negative => rotate outward
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
		},

		// We'll fill frames 6..12 with duplicates if needed or keep them unused
		// so that 13..16 and 17..19 are intact for the specialized yes/no reaction
		{},
		{},
		{},
		{},
		{},
		{},
		{}, // 6..12 empty

		// 13 => jump start, arms fully up
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -90,
			frontArm: -90,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
			bodyOffsetY: -10,
		},
		// 14 => peak of jump, arms still up
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -90,
			frontArm: -90,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
			bodyOffsetY: -20,
		},
		// 15 => halfway down, arms still up
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -90,
			frontArm: -90,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
			bodyOffsetY: -10,
		},
		// 16 => land, arms still up, big laugh
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -90,
			frontArm: -90,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
			bodyOffsetY: 0,
		},

		// 17..19 => NO shrug
		{
			headX: 70,
			headY: 55,
			headRotate: 5,
			backArm: -10,
			frontArm: 10,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 5,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: -15,
			frontArm: 15,
			backLeg: 5,
			frontLeg: -5,
			torsoRotate: 0,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: -5,
			backArm: -20,
			frontArm: 20,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: -5,
			offsetX: 25,
			offsetY: 0,
			scale: 1.0,
		},
	];

	const pose = framesData[frameIndex] || framesData[0];
	const {
		headX,
		headY,
		headRotate,
		backArm,
		frontArm,
		backLeg,
		frontLeg,
		torsoRotate,
		offsetX = 0,
		offsetY = 0,
		scale = 1,
		bodyOffsetY = 0,
	} = pose;

	// EYES
	const renderEyes = () => {
		if (blinkFrame === 1) {
			return (
				<>
					<path d='M64 54 L68 54' stroke='#333' strokeWidth='2' />
					<path d='M72 54 L76 54' stroke='#333' strokeWidth='2' />
				</>
			);
		}
		return (
			<>
				<circle cx='66' cy='54' r='1.8' fill='#333' />
				<circle cx='74' cy='54' r='1.8' fill='#333' />
			</>
		);
	};

	// MOUTH
	const renderMouth = () => {
		if (talkFrame === 1) {
			// open mouth
			return <path d='M65 61 Q70 64 75 61 Q70 67 65 61' fill='#000' />;
		} else if (talkFrame === 2) {
			// big grin
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
		}
		// default small smile
		return (
			<path
				d='M65 61 Q70 65 75 61'
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
			/>
		);
	};

	// BUBBLE
	const bubbleRef = useRef(null);
	const [bubbleBBox, setBubbleBBox] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (bubbleRef.current) {
			const box = bubbleRef.current.getBBox();
			setBubbleBBox({ width: box.width, height: box.height });
		}
	}, [showBubble, showFinalMessage]);

	const getBubblePath = (w, h) => {
		const pad = 10;
		const totalW = w + pad * 2;
		const totalH = h + pad * 2;
		const tail = 10; // tail protrudes on the left side
		return `
      M${tail},0
      H${totalW}
      Q${totalW + 5} 0, ${totalW + 5} 5
      V${totalH - 5}
      Q${totalW + 5} ${totalH} ${totalW} ${totalH}
      H${tail}
      L0 ${totalH / 2}
      Z
    `;
	};

	const bubblePath = getBubblePath(
		bubbleBBox.width || 140,
		bubbleBBox.height || 60
	);

	// Position the bubble near the head
	const outerX = 70;
	const outerY = 140;
	const headAbsoluteX = outerX + offsetX + headX * scale;
	const headAbsoluteY = outerY + offsetY + headY * scale + bodyOffsetY;
	const bubbleOffsetX = headAbsoluteX + 20;
	const bubbleOffsetY = headAbsoluteY - ((bubbleBBox.height || 60) + 20) / 2;

	const renderBubble = () => {
		if (!showBubble) return null;
		return (
			<g transform={`translate(${bubbleOffsetX}, ${bubbleOffsetY})`}>
				<motion.path
					fill='#fff'
					stroke='#000'
					strokeWidth='0.2'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, d: bubblePath }}
					transition={{ duration: 0.4 }}
				/>
				<g ref={bubbleRef}>
					{!showFinalMessage ? (
						<>
							<text
								x='10'
								y='20'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								Hi there,
							</text>
							<text
								x='10'
								y='36'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								My name is Gabriel.
							</text>
							<text
								x='10'
								y='52'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								Great to have you here! 🤗
							</text>
						</>
					) : (
						<>
							<text
								x='10'
								y='20'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								Check our Print On Demand Products! 💡
							</text>
							<text
								x='10'
								y='36'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								A gift that will never be forgettable! 🎁
							</text>
						</>
					)}
				</g>
			</g>
		);
	};

	// The main transform for the character
	// Also apply bodyOffsetY (used in the jump frames 13..16)
	const transformStr = `
    translate(${offsetX}px, ${offsetY + (bodyOffsetY || 0)}px) 
    scale(${scale})
  `;

	return (
		<svg
			width='260'
			height='320'
			viewBox='0 0 260 320'
			style={{ overflow: "visible" }}
		>
			{/* Outer anchor */}
			<g transform='translate(70,140)'>
				<g
					style={{
						transformOrigin: "0px 0px",
						transform: transformStr,
						transition: "transform 0.4s",
					}}
				>
					{/* BACK ARM */}
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

					{/* BACK LEG */}
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
					<g
						style={{
							transformOrigin: "70px 90px",
							transform: `rotate(${torsoRotate}deg)`,
							transition: "transform 0.25s",
						}}
					>
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
					</g>

					{/* FRONT ARM */}
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

					{/* FRONT LEG */}
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
					<g
						style={{
							transformOrigin: `${headX}px ${headY}px`,
							transform: `rotate(${headRotate}deg)`,
							transition: "transform 0.25s",
						}}
					>
						<ellipse cx={headX} cy={headY} rx='10' ry='12' fill='#f1c27d' />
						{/* Hair */}
						<path
							d={`
                M${headX - 6} ${headY - 11}
                C ${headX - 4} ${headY - 16}, 
                  ${headX + 4} ${headY - 16}, 
                  ${headX + 6} ${headY - 11}
                C ${headX + 6} ${headY - 9}, 
                  ${headX - 6} ${headY - 9}, 
                  ${headX - 6} ${headY - 11}
              `}
							fill='#3c2e2d'
						/>
						{renderEyes()}
						{/* Nose */}
						<path
							d={`
                M${headX - 1} ${headY + 2} 
                L${headX + 1} ${headY + 2} 
                L${headX} ${headY + 4} 
                Z
              `}
							fill='#f1c27d'
							stroke='#333'
							strokeWidth='0.5'
						/>
						{/* Mouth (only if isTalking) */}
						{isTalking && renderMouth()}
					</g>
				</g>
			</g>

			{/* Speech Bubble */}
			{renderBubble()}
		</svg>
	);
}
