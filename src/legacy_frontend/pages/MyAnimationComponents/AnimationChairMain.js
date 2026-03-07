import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { motion } from "framer-motion";
import SVGChildChair from "./SVGChildChair";

/**
 * This parent component coordinates the timeline:
 *  0–0.5s: frame=0 (sitting, one unified drawing).
 *  0.5–1.5s: frames=1..2 (standing up).
 *  1.5–3.5s: frames=3..6 (walking steps, chair disappears).
 *  3.5s => frame=7 (final stand).
 *  4.0s => show bubble and start mouth movement.
 *  6.5s => show final message.
 *
 * The entire sequence takes ~6.5s to finish.
 */
export default function AnimationChairMain() {
	const [frameIndex, setFrameIndex] = useState(0);

	// Bubble + final message
	const [showBubble, setShowBubble] = useState(false);
	const [showFinalMessage, setShowFinalMessage] = useState(false);

	// Mouth states
	const [isTalking, setIsTalking] = useState(false);
	const [talkFrame, setTalkFrame] = useState(0);

	// Timers
	const sittingTimerRef = useRef(null);
	const standIntervalRef = useRef(null);
	const walkIntervalRef = useRef(null);
	const bubbleTimerRef = useRef(null);
	const talkIntervalRef = useRef(null);
	const finalMsgTimerRef = useRef(null);

	const clearAllTimers = () => {
		clearTimeout(sittingTimerRef.current);
		clearInterval(standIntervalRef.current);
		clearInterval(walkIntervalRef.current);
		clearTimeout(bubbleTimerRef.current);
		clearInterval(talkIntervalRef.current);
		clearTimeout(finalMsgTimerRef.current);
	};

	useEffect(() => {
		/**
		 * Timeline:
		 *  0s:    frame=0 (sitting with chair, single entity)
		 *  0.5s:  stand frames=1..2 (1s total)
		 *  1.5-3.5s: walk frames=3..6 (2s total, chair fades out)
		 *  3.5s:  frame=7 (final stand)
		 *  4.0s:  show bubble, start talking
		 *  6.5s:  show final message
		 */
		setFrameIndex(0);

		// After 0.5s => stand frames (1..2)
		sittingTimerRef.current = setTimeout(() => {
			let standFrame = 1;
			standIntervalRef.current = setInterval(() => {
				setFrameIndex(standFrame);
				standFrame++;
				if (standFrame > 2) {
					clearInterval(standIntervalRef.current);

					// Now do walking from frames 3..6 (4 steps, 0.5s each)
					let walkFrame = 3;
					walkIntervalRef.current = setInterval(() => {
						setFrameIndex(walkFrame);
						walkFrame++;
						if (walkFrame > 6) {
							clearInterval(walkIntervalRef.current);
							// Final stand
							setFrameIndex(7);

							// After 0.5s => show bubble + talk
							bubbleTimerRef.current = setTimeout(() => {
								setShowBubble(true);
								setIsTalking(true);
								// Toggle mouth open/close every 400ms
								talkIntervalRef.current = setInterval(() => {
									setTalkFrame((prev) => (prev === 0 ? 1 : 0));
								}, 400);

								// After 2.5s of bubble => final message
								finalMsgTimerRef.current = setTimeout(() => {
									clearInterval(talkIntervalRef.current);
									setTalkFrame(2); // big grin
									setShowFinalMessage(true);
								}, 2500);
							}, 500);
						}
					}, 500);
				}
			}, 500);
		}, 500);

		return () => clearAllTimers();
	}, []);

	return (
		<Wrapper>
			<MotionContainer>
				<SVGChildChair
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
	width: 260px; /* Give a bit more space */
	height: 320px;
`;

const MotionContainer = styled(motion.div)`
	position: absolute;
	bottom: 0;
	width: 260px;
	height: 320px;
`;
