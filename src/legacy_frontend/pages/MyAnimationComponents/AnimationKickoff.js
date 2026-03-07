import React, { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import SVGChildKickoff from "./SVGChildKickoff";

/**
 * Props:
 *  - action: null | "YES" | "NO"
 *  - onSpecialAnimationEnd: callback when the specialized yes/no animation finishes
 */
export default function AnimationKickoff({ action, onSpecialAnimationEnd }) {
	const [frameIndex, setFrameIndex] = useState(0);
	const [currentBubble, setCurrentBubble] = useState("sleeping");

	// Controls mouth states (talkFrame = 0,1,2,3).
	const [isTalking, setIsTalking] = useState(false);
	const [talkFrame, setTalkFrame] = useState(0);

	// Show/hide the final text lines
	const [showFinalMessage, setShowFinalMessage] = useState(false);

	// For showing specialized “thanks” or “sorry” bubble at end
	const [specialBubble, setSpecialBubble] = useState(null);

	// Keep references to all timeouts/intervals to clear them
	const sleepTimerRef = useRef();
	const wakeIntervalRef = useRef();
	const flyIntervalRef = useRef();
	const talkIntervalRef = useRef();
	const grinTimerRef = useRef();
	const smallGrinTimerRef = useRef();
	const finalMsgTimerRef = useRef();
	const gestureTimerRef = useRef();
	const gestureIntervalRef = useRef();

	const clearAllTimers = () => {
		clearTimeout(sleepTimerRef.current);
		clearInterval(wakeIntervalRef.current);
		clearInterval(flyIntervalRef.current);
		clearInterval(talkIntervalRef.current);
		clearTimeout(grinTimerRef.current);
		clearTimeout(smallGrinTimerRef.current);
		clearTimeout(finalMsgTimerRef.current);
		clearTimeout(gestureTimerRef.current);
		clearInterval(gestureIntervalRef.current);
	};

	/**
	 * Default "wake up" animation runs on mount if no user action triggered.
	 * As soon as user clicks "YES"/"NO", we override it.
	 */
	useEffect(() => {
		// Only run default if no action is set
		if (action) return;

		// 1) After 1s, show "surprise" => animate frames 1..5
		sleepTimerRef.current = setTimeout(() => {
			setCurrentBubble("surprise");

			let wakeFrame = 1;
			wakeIntervalRef.current = setInterval(() => {
				setFrameIndex(wakeFrame);
				wakeFrame++;
				if (wakeFrame > 5) {
					clearInterval(wakeIntervalRef.current);

					// 2) Then frames 6..9
					let flyFrame = 6;
					flyIntervalRef.current = setInterval(() => {
						setFrameIndex(flyFrame);
						flyFrame++;
						if (flyFrame > 9) {
							clearInterval(flyIntervalRef.current);

							// Switch to "final" bubble and start talking
							setFrameIndex(9);
							setCurrentBubble("final");
							setIsTalking(true);

							// Toggle mouth open/closed quickly
							talkIntervalRef.current = setInterval(() => {
								setTalkFrame((prev) => (prev === 0 ? 1 : 0));
							}, 400);

							// After 3s => show big grin (talkFrame=2)
							grinTimerRef.current = setTimeout(() => {
								clearInterval(talkIntervalRef.current);
								setTalkFrame(2);

								// Another 3s => smaller grin (talkFrame=3)
								smallGrinTimerRef.current = setTimeout(() => {
									setTalkFrame(3);
								}, 3000);
							}, 3000);

							// 3) After 2.5s => reveal final text
							finalMsgTimerRef.current = setTimeout(() => {
								setShowFinalMessage(true);

								// 4) One second after final text => frames 10..12
								gestureTimerRef.current = setTimeout(() => {
									let gestureFrame = 10;
									gestureIntervalRef.current = setInterval(() => {
										setFrameIndex(gestureFrame);
										gestureFrame++;
										if (gestureFrame > 12) {
											clearInterval(gestureIntervalRef.current);
										}
									}, 250);
								}, 1000);
							}, 2500);
						}
					}, 250);
				}
			}, 400);

			// Remove sleeping bubble once we actually start
			setCurrentBubble((prev) => (prev === "sleeping" ? null : prev));
		}, 1000);

		return () => clearAllTimers();
	}, [action]);

	/**
	 * If action = "YES" or "NO", do specialized animation, then onSpecialAnimationEnd()
	 */
	useEffect(() => {
		if (!action) return;
		// Clear default timeline
		clearAllTimers();

		if (action === "YES") {
			// Show "thank you" bubble from the start
			setSpecialBubble("thanks");
			setCurrentBubble(null);
			setIsTalking(false);
			setShowFinalMessage(false);

			// We want a 1.5s sequence:
			//   0-0.5s => frame 13 (jump up, arms up)
			//   0.5-1.0s => frame 14 (come down)
			//   1.0-1.5s => frame 15 (big laugh with white teeth)
			//
			// Below is the OLD array:
			// const yesFrames = [13, 14, 15]; // old approach
			//
			// NEW approach: we add frame 16 for a smoother 4-step jump arc
			const yesFrames = [13, 14, 15, 16];
			let idx = 0;
			const intervalId = setInterval(() => {
				setFrameIndex(yesFrames[idx]);
				idx++;
				if (idx >= yesFrames.length) {
					clearInterval(intervalId);
					// At the end => redirect
					onSpecialAnimationEnd?.();
				}
			}, 400); // 4 frames * 400ms = ~1.6s total

			return () => clearInterval(intervalId);
		}

		if (action === "NO") {
			// Show quick shrug then "sorry" bubble
			setSpecialBubble(null);
			setCurrentBubble(null);
			setIsTalking(false);
			setShowFinalMessage(false);

			let noFrames = [17, 18, 19, 18, 17];
			let idx = 0;
			const intervalId = setInterval(() => {
				setFrameIndex(noFrames[idx]);
				idx++;
				if (idx >= noFrames.length) {
					clearInterval(intervalId);
					setSpecialBubble("sorry");
					// After 1.5s or so, end
					setTimeout(() => {
						setSpecialBubble(null);
						onSpecialAnimationEnd?.();
					}, 1500);
				}
			}, 250);

			return () => clearInterval(intervalId);
		}
	}, [action, onSpecialAnimationEnd]);

	return (
		<Wrapper>
			<MotionContainer>
				<SVGChildKickoff
					frameIndex={frameIndex}
					currentBubble={currentBubble}
					isTalking={isTalking}
					talkFrame={talkFrame}
					showFinalMessage={showFinalMessage}
					specialBubble={specialBubble}
				/>
			</MotionContainer>
		</Wrapper>
	);
}

const Wrapper = styled.div`
	position: relative;
	width: 100px;
	height: 200px;
`;

const MotionContainer = styled(motion.div)`
	position: absolute;
	bottom: 0;
	width: 100px;
	height: 200px;
`;
