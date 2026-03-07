import React from "react";
import styled, { keyframes } from "styled-components";
import WalkingImage from "./Walking.jpg";

const MyAnimationComponentsMain = () => {
	return (
		<MyAnimationComponentsMainWrapper>
			<Character />
		</MyAnimationComponentsMainWrapper>
	);
};

export default MyAnimationComponentsMain;

// 1) Keyframes for the walking “step cycle”
const walkCycle = keyframes`
  0%   { background-position:   0   0; }
  100% { background-position: -600px 0; }
  /*
    Explanation:
    - We go from background-position: 0 (the first frame),
      all the way to -600px, which is 6 frames × 100px each, 
      effectively cycling through all frames.
    - The steps(...) function below automatically “snaps” 
      between frames so it looks discrete (like a cartoon).
  */
`;

// 2) Keyframes for moving left → center
//    Adjust the translateX(...) to your layout
const moveToCenter = keyframes`
  0%   { transform: translateX(0); }
  100% { transform: translateX(50vw); }
`;

// 3) Combine them in a styled div
const Character = styled.div`
	width: 90px; /* width of a single frame */
	height: 200px; /* or whatever matches your sprite’s height */
	background: url(${WalkingImage}) left center no-repeat;

	position: absolute;
	bottom: 0; /* so it “stands” on the bottom of wrapper */
	left: 0; /* start from left edge */

	/* 4) The actual animations: 
        - walkCycle uses steps(6) to jump through 6 frames. 
        - moveToCenter slides the element from left to the center.
  */
	animation:
		${walkCycle} 1s steps(6) infinite,
		/* cycle frames forever (or until you decide to stop) */ ${moveToCenter} 3s
			linear forwards; /* walk from left to center, taking 3s */
`;

const MyAnimationComponentsMainWrapper = styled.div`
	position: relative;
	min-height: 600px;
	overflow: hidden;
`;
