import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import SVGChild from "./SVGChild";

export default function AnimationWalkingComponent() {
	const [frameIndex, setFrameIndex] = useState(0); // 0..8
	const [isStopped, setIsStopped] = useState(false); // True once walk ends

	// We'll use isTalking to display the speech bubble and animate the mouth
	const [isTalking, setIsTalking] = useState(false);
	const [talkFrame, setTalkFrame] = useState(0);

	// Controls which text is shown in the bubble
	const [showFinalMessage, setShowFinalMessage] = useState(false);

	// Basic horizontal motion from left to center
	const containerVariants = {
		initial: { x: 0 },
		animate: {
			x: "calc(50vw - 50px)",
			transition: { duration: 4, ease: "easeInOut" },
		},
	};

	const handleMotionComplete = () => {
		setIsStopped(true);
	};

	// Cycle frames for walking
	useEffect(() => {
		let timer;
		if (!isStopped) {
			// cycle frames 0..7 every 125 ms
			timer = setInterval(() => {
				setFrameIndex((prev) => (prev + 1) % 8);
			}, 125);
		} else {
			// once stopped, fix at frame 8 (front-facing)
			setFrameIndex(8);
		}
		return () => clearInterval(timer);
	}, [isStopped]);

	/**
	 * Once walking stops:
	 *   - Start talking (open/close mouth continuously).
	 *   - After 2.5s, show final text.
	 *   - After 3s of final text, show bigger grin (teeth).
	 *   - [NEW] Then 3s after that, show a smaller grin with teeth (talkFrame=3).
	 */
	useEffect(() => {
		if (isStopped) {
			setIsTalking(true);
			setTalkFrame(0);

			// 1) Keep toggling mouth open/close every 400ms
			const talkInterval = setInterval(() => {
				setTalkFrame((prev) => (prev === 0 ? 1 : 0));
			}, 400);

			// 2) After 2.5s, show final text
			const msgTimer = setTimeout(() => {
				setShowFinalMessage(true);

				// 3) After 3 more seconds, stop toggling mouth and show big grin (talkFrame=2)
				const grinTimer = setTimeout(() => {
					clearInterval(talkInterval);
					setTalkFrame(2); // the original big grin

					// 4) [NEW] Another 3 seconds later, show the tiny-tooth grin (talkFrame=3)
					const smallGrinTimer = setTimeout(() => {
						setTalkFrame(3);
					}, 3000);

					// Cleanup for the smallGrinTimer
					return () => clearTimeout(smallGrinTimer);
				}, 3000);

				// Cleanup for grinTimer
				return () => clearTimeout(grinTimer);
			}, 3000);

			// Cleanup
			return () => {
				clearInterval(talkInterval);
				clearTimeout(msgTimer);
			};
		}
	}, [isStopped]);

	// frames data
	const framesData = [
		{
			backArm: -20,
			backLeg: -10,
			frontArm: 20,
			frontLeg: 10,
			frontFacing: false,
		},
		{
			backArm: -10,
			backLeg: -5,
			frontArm: 10,
			frontLeg: 5,
			frontFacing: false,
		},
		{ backArm: 0, backLeg: 0, frontArm: 0, frontLeg: 0, frontFacing: false },
		{
			backArm: 10,
			backLeg: 5,
			frontArm: -10,
			frontLeg: -5,
			frontFacing: false,
		},
		{
			backArm: 20,
			backLeg: 10,
			frontArm: -20,
			frontLeg: -10,
			frontFacing: false,
		},
		{
			backArm: -15,
			backLeg: -8,
			frontArm: 15,
			frontLeg: 8,
			frontFacing: false,
		},
		{
			backArm: -5,
			backLeg: -3,
			frontArm: 5,
			frontLeg: 3,
			frontFacing: false,
		},
		{ backArm: 0, backLeg: 0, frontArm: 0, frontLeg: 0, frontFacing: false },
		// final front-facing
		{ backArm: 0, backLeg: 0, frontArm: 0, frontLeg: 0, frontFacing: true },
	];

	return (
		<Wrapper>
			<MotionContainer
				initial='initial'
				animate='animate'
				variants={containerVariants}
				onAnimationComplete={handleMotionComplete}
			>
				<SVGChild
					backArmRotate={framesData[frameIndex].backArm}
					backLegRotate={framesData[frameIndex].backLeg}
					frontArmRotate={framesData[frameIndex].frontArm}
					frontLegRotate={framesData[frameIndex].frontLeg}
					frontFacing={framesData[frameIndex].frontFacing}
					isTalking={isTalking}
					talkFrame={talkFrame}
					showFinalMessage={showFinalMessage}
				/>
			</MotionContainer>
		</Wrapper>
	);
}

/* STYLES */
const Wrapper = styled.div`
	position: relative;
	width: 100%;
	min-height: 600px;
	background: #f0f0f0;
`;

const MotionContainer = styled(motion.div)`
	position: absolute;
	bottom: 0;
	width: 100px; /* matches the SVG character’s width */
`;
