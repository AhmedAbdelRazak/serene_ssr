import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Example T-shirt images
import TShirtDesignExample from "../../GeneralImages/TShirtDesignExample.jpg";
import TShirtDesignExample2 from "../../GeneralImages/TShirtDesignExample2.png";

export default function SVGChildProductPresentation({
	frameIndex,
	bubbleContent,
	showTShirt1,
	showTShirt2,
	slideImageDown,
	isMobile, // <-- we receive isMobile here
}) {
	// Blink (0=normal, 1=blink)
	const [blinkFrame, setBlinkFrame] = useState(0);

	// Mouth frames: 0=small smile, 1=open(talking)
	const [talkFrame, setTalkFrame] = useState(0);

	// Fade-out control
	const [fadeOut, setFadeOut] = useState(false);
	const fadeOutTimeoutRef = useRef(null);

	// Start 2-sec timer at final pose => fade out
	useEffect(() => {
		if (frameIndex === 8) {
			fadeOutTimeoutRef.current = setTimeout(() => {
				setFadeOut(true);
			}, 2000);
		} else {
			setFadeOut(false);
			if (fadeOutTimeoutRef.current) {
				clearTimeout(fadeOutTimeoutRef.current);
			}
		}
		return () => {
			if (fadeOutTimeoutRef.current) {
				clearTimeout(fadeOutTimeoutRef.current);
			}
		};
	}, [frameIndex]);

	//
	// Toggle mouth open if there's bubble text, but do NOT toggle at final pose (8).
	//
	useEffect(() => {
		let mouthInterval;
		if (bubbleContent && frameIndex < 8) {
			mouthInterval = setInterval(() => {
				setTalkFrame((prev) => (prev === 0 ? 1 : 0));
			}, 400);
		} else {
			setTalkFrame(0);
		}
		return () => clearInterval(mouthInterval);
	}, [bubbleContent, frameIndex]);

	//
	// Blink every 2 seconds
	//
	useEffect(() => {
		const blinkInterval = setInterval(() => {
			setBlinkFrame(1);
			setTimeout(() => setBlinkFrame(0), 150);
		}, 2000);
		return () => clearInterval(blinkInterval);
	}, []);

	//
	// FRAMES: 0..3 => walking, 4 => stand, 5 => left arm up,
	//         6 => unused, 7 => left arm ~30°, 8 => final
	//
	const framesData = [
		// 0 => step #1
		{
			backArm: -10,
			frontArm: 10,
			backLeg: 20,
			frontLeg: -20,
			offsetX: 0,
		},
		// 1 => step #2
		{
			backArm: 10,
			frontArm: -10,
			backLeg: -10,
			frontLeg: 10,
			offsetX: 5,
		},
		// 2 => step #3
		{
			backArm: -15,
			frontArm: 15,
			backLeg: 15,
			frontLeg: -15,
			offsetX: 10,
		},
		// 3 => step #4
		{
			backArm: 15,
			frontArm: -15,
			backLeg: -5,
			frontLeg: 5,
			offsetX: 15,
		},
		// 4 => stand
		{
			backArm: 0,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			offsetX: 20,
		},
		// 5 => left arm up
		{
			backArm: -140,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			offsetX: 20,
		},
		// 6 => unused
		{
			backArm: -80,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			offsetX: 20,
		},
		// 7 => left arm ~30°
		{
			backArm: 30,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			offsetX: 20,
		},
		// 8 => final facing front
		{
			backArm: -40,
			frontArm: 0,
			backLeg: 0,
			frontLeg: 0,
			offsetX: 0,
		},
	];

	// ---------------------------------------------------
	// If mobile => force frames 2 & 3 to match frame 1
	// => Only 2 unique walking steps (frame 0 & frame 1).
	// ---------------------------------------------------
	const framesDataAdjusted = [...framesData];
	if (isMobile) {
		framesDataAdjusted[2] = { ...framesDataAdjusted[1] };
		framesDataAdjusted[3] = { ...framesDataAdjusted[1] };
	}

	const rawPose = framesDataAdjusted[frameIndex] || framesDataAdjusted[0];
	const { backArm, frontArm, backLeg, frontLeg, offsetX } = rawPose;

	//
	// EYES
	//
	const renderEyes = () => {
		if (blinkFrame === 1) {
			// Blink
			return (
				<>
					<path d='M64 54 L68 54' stroke='#333' strokeWidth='2' />
					<path d='M72 54 L76 54' stroke='#333' strokeWidth='2' />
				</>
			);
		}
		// Normal eyes
		return (
			<>
				<circle cx='66' cy='54' r='1.8' fill='#333' />
				<circle cx='74' cy='54' r='1.8' fill='#333' />
			</>
		);
	};

	//
	// MOUTH
	//
	const renderMouth = () => {
		if (talkFrame === 1) {
			// Open (talking)
			return <path d='M65 61 Q70 64 75 61 Q70 67 65 61' fill='#000' />;
		}
		// Closed/small smile
		return (
			<path
				d='M65 61 Q70 65 75 61'
				stroke='#fff'
				strokeWidth='1.5'
				fill='transparent'
			/>
		);
	};

	//
	// BUBBLE + IMAGES
	//
	const bubbleRef = useRef(null);
	const [bubbleBBox, setBubbleBBox] = useState({ width: 0, height: 0 });

	useEffect(() => {
		if (bubbleRef.current) {
			const box = bubbleRef.current.getBBox();
			setBubbleBBox({ width: box.width, height: box.height });
		}
	}, [bubbleContent, showTShirt1, showTShirt2]);

	// Tail bubble path
	const getBubblePathLeftTail = (w, h) => {
		const pad = 10;
		const totalW = w + pad * 2;
		const totalH = h + pad * 2;
		const tail = 12;
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
	};

	const hasBubble = bubbleContent || showTShirt1 || showTShirt2;
	const showBubbleFrame = bubbleContent && !showTShirt1 && !showTShirt2;
	const bubblePath = getBubblePathLeftTail(bubbleBBox.width, bubbleBBox.height);

	const renderBubble = () => {
		if (!hasBubble) return null;

		const bubbleX = 160;
		const bubbleY = 140;

		return (
			<g transform={`translate(${bubbleX},${bubbleY})`}>
				{showBubbleFrame && (
					<motion.path
						fill='#fff'
						stroke='#ccc'
						strokeWidth='1'
						initial={{ opacity: 0 }}
						animate={{ opacity: 1, d: bubblePath }}
						transition={{ duration: 0.4 }}
					/>
				)}

				<g ref={bubbleRef} transform='translate(10,10)'>
					{bubbleContent && (
						<text x='0' y='0' fontSize='14' fill='#000' dy='1em'>
							{bubbleContent}
						</text>
					)}

					<AnimatePresence>
						{showTShirt1 && (
							<motion.image
								key='shirt1'
								href={TShirtDesignExample}
								x='50'
								y='-130'
								width='250'
								height='280'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.6 }}
							/>
						)}
					</AnimatePresence>

					<AnimatePresence>
						{showTShirt2 && (
							<motion.image
								key='shirt2'
								href={TShirtDesignExample2}
								x='50'
								y='-130'
								width='250'
								height='280'
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.6 }}
							/>
						)}
					</AnimatePresence>
				</g>
			</g>
		);
	};

	//
	// Fade-out using AnimatePresence
	//
	return (
		<AnimatePresence>
			{!fadeOut && (
				<motion.svg
					key='characterSvg'
					width='260'
					height='320'
					viewBox='0 0 260 320'
					style={{ overflow: "visible" }}
					initial={{ opacity: 1 }}
					animate={{ opacity: 1 }}
					exit={{
						opacity: 0,
						transition: { duration: 1 },
					}}
				>
					<g transform='translate(70,140)'>
						<g
							style={{
								transformOrigin: "0 0",
								transform: `translate(${offsetX}px,0)`,
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
									d={`
                    M${70 - 1} ${55 + 2}
                    L${70 + 1} ${55 + 2}
                    L${70} ${55 + 4}
                  `}
									fill='#f1c27d'
									stroke='#333'
									strokeWidth='0.5'
								/>
								{/* Mouth */}
								{renderMouth()}
							</g>
						</g>
					</g>

					{/* Bubble (text + images) */}
					{renderBubble()}
				</motion.svg>
			)}
		</AnimatePresence>
	);
}
