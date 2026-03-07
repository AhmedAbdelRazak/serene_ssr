import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import SVGChildWalkingGreeting from "./SVGChildWalkingGreeting";

/**
 * Props:
 *  - action: null | "YES" | "NO"
 *  - onSpecialAnimationEnd: callback when specialized yes/no animation finishes
 */
export default function AnimationWalkingGreeting({
	action,
	onSpecialAnimationEnd,
}) {
	const [frameIndex, setFrameIndex] = useState(0);

	// Bubble and final message flags
	const [showBubble, setShowBubble] = useState(false);
	const [showFinalMessage, setShowFinalMessage] = useState(false);

	// Mouth state
	const [isTalking, setIsTalking] = useState(false);
	const [talkFrame, setTalkFrame] = useState(0);

	// Timers
	const walkIntervalRef = useRef(null);
	const bubbleTimerRef = useRef(null);
	const talkIntervalRef = useRef(null);
	const finalMsgTimerRef = useRef(null);

	const clearAllTimers = () => {
		clearInterval(walkIntervalRef.current);
		clearTimeout(bubbleTimerRef.current);
		clearInterval(talkIntervalRef.current);
		clearTimeout(finalMsgTimerRef.current);
	};

	// Normal timeline (only if no action is triggered)
	useEffect(() => {
		if (action) return; // if user clicked yes/no quickly, skip normal timeline

		/**
		 * Normal timeline:
		 *  - 0..2s: walk frames 0..3 (500ms each)
		 *     - At the 2nd step (frame=2), start talking
		 *  - 2s: frame=4 (final stand)
		 *  - 2.5s: frame=5 (left arm points out)
		 *  - 5s: show final message
		 */
		setFrameIndex(0);
		setShowBubble(false);
		setIsTalking(false);
		setShowFinalMessage(false);
		setTalkFrame(0);

		let currentStep = 0;
		// Step every 500ms => frames 0..3 walking
		walkIntervalRef.current = setInterval(() => {
			currentStep += 1;
			setFrameIndex(currentStep);

			// Start talking at the second step
			if (currentStep === 2) {
				setShowBubble(true);
				setIsTalking(true);
				// Toggle mouth open/close every 400ms
				talkIntervalRef.current = setInterval(() => {
					setTalkFrame((prev) => (prev === 0 ? 1 : 0));
				}, 400);
			}

			// Once we reach step 3 => done walking frames 0..3 => next is final stand
			if (currentStep >= 3) {
				clearInterval(walkIntervalRef.current);
				// final stand = frame 4
				setFrameIndex(4);

				// after 0.5s => frame=5 (point left arm)
				bubbleTimerRef.current = setTimeout(() => {
					setFrameIndex(5);
				}, 500);
			}
		}, 500);

		// Show final message at 5s
		finalMsgTimerRef.current = setTimeout(() => {
			clearInterval(talkIntervalRef.current);
			setTalkFrame(2); // big grin
			setShowFinalMessage(true);
		}, 5000);

		return () => clearAllTimers();
	}, [action]);

	// If user selects YES or NO, we skip normal timeline and do specialized frames
	useEffect(() => {
		if (!action) return;
		// Clear any normal timeline
		clearAllTimers();

		// Turn off bubble or any normal talk
		setShowBubble(false);
		setIsTalking(false);
		setShowFinalMessage(false);

		// YES => jump frames 13..16
		if (action === "YES") {
			let yesFrames = [13, 14, 15, 16];
			let idx = 0;
			const yesInterval = setInterval(() => {
				setFrameIndex(yesFrames[idx]);
				idx++;
				if (idx >= yesFrames.length) {
					clearInterval(yesInterval);
					// done => callback to parent
					onSpecialAnimationEnd?.();
				}
			}, 400);
			return () => clearInterval(yesInterval);
		}

		// NO => shrug frames 17..19.. (then done)
		if (action === "NO") {
			let noFrames = [17, 18, 19, 18, 17];
			let idx = 0;
			const noInterval = setInterval(() => {
				setFrameIndex(noFrames[idx]);
				idx++;
				if (idx >= noFrames.length) {
					clearInterval(noInterval);
					// done => callback to parent
					onSpecialAnimationEnd?.();
				}
			}, 300);
			return () => clearInterval(noInterval);
		}
	}, [action, onSpecialAnimationEnd]);

	return (
		<Wrapper>
			<MotionContainer>
				<SVGChildWalkingGreeting
					frameIndex={frameIndex}
					showBubble={showBubble}
					showFinalMessage={showFinalMessage}
					isTalking={isTalking}
					talkFrame={talkFrame}
				/>
			</MotionContainer>
		</Wrapper>
	);
}

const Wrapper = styled.div`
	position: relative;
	width: 260px;
	height: 320px;
`;

const MotionContainer = styled(motion.div)`
	position: absolute;
	bottom: 0;
	width: 260px;
	height: 320px;
`;
