import React, { useState, useEffect } from "react";
import SVGChildProductPresentation from "./SVGChildProductPresentation";

export default function AnimationProductPresentation() {
	const [xPos, setXPos] = useState(0);
	const [frameIndex, setFrameIndex] = useState(0);

	// "bubbleContent" controls the speech bubble text
	const [bubbleContent, setBubbleContent] = useState("");

	// T-shirt flags
	const [showTShirt1, setShowTShirt1] = useState(false);
	const [showTShirt2, setShowTShirt2] = useState(false);
	const [slideImageDown, setSlideImageDown] = useState(false);

	// --------------------------------------------------------------
	// Detect if mobile => shorter walking distance
	// (Feel free to adjust the breakpoint (768) and distances.)
	// --------------------------------------------------------------
	const isMobile = window.innerWidth <= 768;
	const walkDistance = isMobile ? 300 : 500;

	useEffect(() => {
		//
		// 1) Walk from x=0..(300 on mobile OR 500 on desktop) in 3s, frames 0..3
		//
		setXPos(0);
		// Move to final distance after a tiny delay
		setTimeout(() => setXPos(walkDistance), 50);

		let frameCycle = 0;
		const walkInterval = setInterval(() => {
			frameCycle = (frameCycle + 1) % 4;
			setFrameIndex(frameCycle);
		}, 400);

		// After 3s, stand still => frame=4
		const stopWalkingTimer = setTimeout(() => {
			clearInterval(walkInterval);
			setFrameIndex(4);
		}, 3000);

		// We'll store all other timers here to clear later
		const timeouts = [];

		// 2) Bubble text #1
		setBubbleContent("Welcome to our Print on Demand section! 🌟");
		timeouts.push(
			setTimeout(() => {
				// 3) Bubble text #2
				setBubbleContent("I recommend checking out our awesome T-shirts!");
			}, 2500)
		);

		// 4) Bubble text #3 => left arm points up (frame=5)
		timeouts.push(
			setTimeout(() => {
				setBubbleContent("Here are some examples...");
				setFrameIndex(5);
			}, 4500)
		);

		// 5) Hide bubble => show T-shirt #1
		timeouts.push(
			setTimeout(() => {
				setBubbleContent("");
				setShowTShirt1(true);
			}, 6500)
		);
		timeouts.push(
			setTimeout(() => {
				setSlideImageDown(true);
			}, 7000)
		);

		// 6) Switch T-shirt #1 -> T-shirt #2
		timeouts.push(
			setTimeout(() => {
				setShowTShirt1(false);
				setSlideImageDown(false);
				setShowTShirt2(true);
			}, 8500)
		);
		timeouts.push(
			setTimeout(() => {
				setSlideImageDown(true);
			}, 9500)
		);

		// 7) Hide T-shirt #2 => (arm~30°), bubble hidden
		timeouts.push(
			setTimeout(() => {
				setShowTShirt2(false);
				setSlideImageDown(false);
				setFrameIndex(7);
				setBubbleContent("");
			}, 10000)
		);

		// 8) Final bubble text
		timeouts.push(
			setTimeout(() => {
				// Show the final text
				setBubbleContent("Click here to check this out! 🤩");
			}, 11000)
		);

		// 9) Switch to the new final "facing front" frame=8
		//    so the character is fully facing front with arms down
		timeouts.push(
			setTimeout(() => {
				setFrameIndex(8);
				// We DO NOT clear bubbleContent now—so it stays visible forever
			}, 12000)
		);

		// Clean up
		return () => {
			clearInterval(walkInterval);
			clearTimeout(stopWalkingTimer);
			timeouts.forEach((t) => clearTimeout(t));
		};
	}, [walkDistance]);

	return (
		<div
			style={{
				width: "100%",
				height: "200px",
				overflow: "hidden",
				zIndex: 10000,
			}}
		>
			{/* Character container => x=0..(300 or 500) */}
			<div
				style={{
					position: "absolute",
					bottom: 50,
					left: 0,
					transform: `translateX(${xPos}px)`,
					transition: "transform 3s linear",
				}}
			>
				<SVGChildProductPresentation
					frameIndex={frameIndex}
					bubbleContent={bubbleContent}
					showTShirt1={showTShirt1}
					showTShirt2={showTShirt2}
					slideImageDown={slideImageDown}
					isMobile={isMobile} // pass down so child can adjust offset
				/>
			</div>
		</div>
	);
}
