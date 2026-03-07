import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function SVGChildKickoff({
	frameIndex,
	currentBubble,
	isTalking,
	talkFrame,
	showFinalMessage,
	specialBubble, // "thanks" or "sorry"
}) {
	// BLINK LOGIC
	const [blinkFrame, setBlinkFrame] = useState(0);
	useEffect(() => {
		const blinkInterval = setInterval(() => {
			setBlinkFrame(1);
			const closeTimer = setTimeout(() => {
				setBlinkFrame(0);
			}, 200);
			return () => clearTimeout(closeTimer);
		}, 2000);

		return () => clearInterval(blinkInterval);
	}, []);

	// FRAMES DATA
	// We add 13..16 for the “YES” jump sequence:
	//   13 => slightly up, arms up
	//   14 => peak of jump, arms up
	//   15 => halfway down, arms still up
	//   16 => land (offsetY=0), arms still up (and big laugh)
	// Also 17..19 for NO shrug
	//
	// We keep the old definitions. We'll add "bodyOffsetY" to shift the *entire* figure.
	const framesData = [
		// 0: sleeping
		{
			headX: 70,
			headY: 55,
			headRotate: -10,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: -10,
			isLying: true,
			bodyOffsetY: 0,
		},
		// 1..9 same as original
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: true,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 52,
			headRotate: -5,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 10,
			torsoRotate: -5,
			isLying: true,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 50,
			headRotate: -10,
			backArm: 10,
			frontArm: -10,
			backLeg: 15,
			frontLeg: 15,
			torsoRotate: -10,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 48,
			headRotate: -10,
			backArm: 10,
			frontArm: -10,
			backLeg: 30,
			frontLeg: 30,
			torsoRotate: -10,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 50,
			headRotate: 0,
			backArm: -15,
			frontArm: 15,
			backLeg: -20,
			frontLeg: 20,
			torsoRotate: -5,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 48,
			headRotate: 0,
			backArm: -10,
			frontArm: 10,
			backLeg: -15,
			frontLeg: 15,
			torsoRotate: -5,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 52,
			headRotate: 0,
			backArm: -5,
			frontArm: 5,
			backLeg: -5,
			frontLeg: 5,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
		// 10..12: gesture frames
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 20,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 30,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 55,
			headRotate: 0,
			backArm: 0,
			frontArm: 40,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: 0,
			isLying: false,
			bodyOffsetY: 0,
		},
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
			isLying: false,
			bodyOffsetY: -10, // move entire body up a bit
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
			isLying: false,
			bodyOffsetY: -20, // highest point
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
			isLying: false,
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
			isLying: false,
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
			isLying: false,
			bodyOffsetY: 0,
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
			isLying: false,
			bodyOffsetY: 0,
		},
		{
			headX: 70,
			headY: 56,
			headRotate: 10,
			backArm: -20,
			frontArm: 20,
			backLeg: 0,
			frontLeg: 0,
			torsoRotate: -5,
			isLying: false,
			bodyOffsetY: 0,
		},
	];

	const currentPose = framesData[frameIndex] || framesData[0];

	// MOUTH LOGIC
	const renderMouthFront = () => {
		// Big laugh with white teeth on frame 15 OR 16
		if (frameIndex === 15 || frameIndex === 16) {
			return (
				<path
					d='M63 61 Q70 68 77 61'
					fill='#fff' // white "teeth"
					stroke='#000' // black outline
					strokeWidth='1.5'
				/>
			);
		}

		// Otherwise, handle normal talk frames
		if (talkFrame === 1) {
			return <path d='M65 61 Q70 64 75 61 Q70 67 65 61' fill='#000' />;
		} else if (talkFrame === 2) {
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
		// Default: small closed mouth
		return (
			<path
				d='M65 61 Q70 65 75 61'
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
			/>
		);
	};

	const renderMouthSurprised = () => (
		<circle cx='70' cy='61' r='3' fill='#000' />
	);

	// EYES
	const renderEyesFront = () => {
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

	const renderEyesClosed = () => (
		<>
			<path d='M64 54 L68 54' stroke='#333' strokeWidth='2' />
			<path d='M72 54 L76 54' stroke='#333' strokeWidth='2' />
		</>
	);

	// Determine final eyes/mouth
	let eyesElement = renderEyesFront();
	let mouthElement = renderMouthFront();
	if (frameIndex === 0) {
		// sleeping => eyes closed, no mouth
		eyesElement = renderEyesClosed();
		mouthElement = null;
	} else if (frameIndex === 1) {
		// surprise => open circle mouth
		mouthElement = renderMouthSurprised();
	}

	// SPEECH BUBBLES
	const sleepRef = useRef(null);
	const surpriseRef = useRef(null);
	const finalRef = useRef(null);

	const [sleepBBox, setSleepBBox] = useState({ width: 80, height: 30 });
	const [surpriseBBox, setSurpriseBBox] = useState({ width: 130, height: 60 });
	const [finalBBox, setFinalBBox] = useState({ width: 130, height: 60 });

	const measure = (ref, setter) => {
		if (ref.current) {
			const bbox = ref.current.getBBox();
			setter({ width: bbox.width, height: bbox.height });
		}
	};

	useEffect(() => {
		measure(sleepRef, setSleepBBox);
		measure(surpriseRef, setSurpriseBBox);
		measure(finalRef, setFinalBBox);
	}, [currentBubble, showFinalMessage]);

	let activeBBox = { width: 0, height: 0 };
	if (currentBubble === "sleeping") activeBBox = sleepBBox;
	if (currentBubble === "surprise") activeBBox = surpriseBBox;
	if (currentBubble === "final") activeBBox = finalBBox;

	const getBubblePath = (w, h) => {
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
	};

	const dynamicPath = getBubblePath(activeBBox.width, activeBBox.height);
	const arrowY = currentPose.isLying ? 80 : 60;
	const padding = 10;
	const bubbleHeight = activeBBox.height + padding * 2;
	const bubbleOffsetY = arrowY - (bubbleHeight + 15);
	const bubbleOffsetX = 80;

	const renderSpeechBubble = () => {
		if (!currentBubble) return null;
		return (
			<g transform={`translate(${bubbleOffsetX}, ${bubbleOffsetY})`}>
				<motion.path
					fill='#fff'
					stroke='#000'
					strokeWidth='0.2'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, d: dynamicPath }}
					transition={{ duration: 0.4, ease: "easeInOut" }}
				/>

				{/* Sleeping */}
				<motion.g
					ref={sleepRef}
					initial={{ opacity: currentBubble === "sleeping" ? 1 : 0 }}
					animate={{ opacity: currentBubble === "sleeping" ? 1 : 0 }}
					transition={{ duration: 0.4 }}
				>
					<text
						x='10'
						y='20'
						fontSize='16'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						Zzz...
					</text>
				</motion.g>

				{/* Surprise */}
				<motion.g
					ref={surpriseRef}
					initial={{ opacity: currentBubble === "surprise" ? 1 : 0 }}
					animate={{ opacity: currentBubble === "surprise" ? 1 : 0 }}
					transition={{ duration: 0.4 }}
				>
					<text
						x='10'
						y='20'
						fontSize='14'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						OH! We have a visitor!
					</text>
					<text
						x='10'
						y='40'
						fontSize='14'
						fill='#000'
						fontFamily='Arial, sans-serif'
					>
						😮
					</text>
				</motion.g>

				{/* Final */}
				<motion.g
					ref={finalRef}
					initial={{ opacity: currentBubble === "final" ? 1 : 0 }}
					animate={{ opacity: currentBubble === "final" ? 1 : 0 }}
					transition={{ duration: 0.4, ease: "easeInOut" }}
				>
					{!showFinalMessage && (
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
								My name is Jake.
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
					)}
					{showFinalMessage && (
						<>
							<text
								x='10'
								y='20'
								fontSize='14'
								fill='#000'
								fontFamily='Arial, sans-serif'
							>
								Click here to have an idea! 💡
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
				</motion.g>
			</g>
		);
	};

	// If specialBubble = "thanks" or "sorry", we show a separate bubble
	const renderSpecialBubble = () => {
		if (!specialBubble) return null;
		const w = 140;
		const h = 40;
		const bubblePath = getBubblePath(w, h);
		return (
			<g transform={`translate(${bubbleOffsetX}, ${bubbleOffsetY - 15})`}>
				<motion.path
					fill='#fff'
					stroke='#000'
					strokeWidth='0.2'
					initial={{ opacity: 0 }}
					animate={{ opacity: 1, d: bubblePath }}
					transition={{ duration: 0.3 }}
				/>
				{specialBubble === "thanks" && (
					<motion.text
						x='15'
						y='25'
						fontSize='14'
						fill='#000'
						fontFamily='Arial, sans-serif'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}
					>
						Thank you! 😁
					</motion.text>
				)}
				{specialBubble === "sorry" && (
					<motion.text
						x='15'
						y='25'
						fontSize='14'
						fill='#000'
						fontFamily='Arial, sans-serif'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						transition={{ duration: 0.3 }}
					>
						It’s ok, we have other gifts! 🙌
					</motion.text>
				)}
			</g>
		);
	};

	const {
		headX,
		headY,
		headRotate,
		backArm,
		frontArm,
		backLeg,
		frontLeg,
		torsoRotate,
		isLying,
		bodyOffsetY = 0, // new property
	} = currentPose;

	// We apply the bodyOffsetY to the entire body:
	const transforms = [];
	if (isLying) {
		// The existing lying transform
		transforms.push("rotate(90deg) translate(-30px, -40px)");
	}
	// Then add the jump shift (if any)
	transforms.push(`translate(0px, ${bodyOffsetY}px)`);

	return (
		<svg
			width='140'
			height='200'
			viewBox='0 0 140 200'
			style={{ overflow: "visible" }}
		>
			{/* Flip horizontally so the character faces left */}
			<g
				style={{
					transform: "scaleX(-1)",
					transformOrigin: "70px 110px",
				}}
			>
				<g
					style={{
						transformOrigin: "70px 110px",
						transform: transforms.join(" "),
						transition: "transform 0.25s",
					}}
				>
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
						{/* hair */}
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
						{/* EYES */}
						{eyesElement}
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
						{/* MOUTH (only if not lying) */}
						{!isLying && mouthElement}
					</g>
				</g>
			</g>

			{/* Default wake-up speech bubble */}
			{renderSpeechBubble()}

			{/* Specialized bubble for "thanks" or "sorry" */}
			{renderSpecialBubble()}
		</svg>
	);
}
