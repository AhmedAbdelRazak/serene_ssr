import React from "react";
import styled from "styled-components";

const TestDrag = () => {
	return (
		<Container>
			<ResizableBox>
				This is some sample text. Drag the bottom-right corner to resize this
				box.
			</ResizableBox>
		</Container>
	);
};

export default TestDrag;

/* ========== Styled Components ========== */

const Container = styled.div`
	/* Center everything for demo */
	display: flex;
	justify-content: center;
	align-items: center;
	height: 80vh;
`;

const ResizableBox = styled.div`
	width: 250px;
	height: 150px;
	resize: both;
	overflow: auto;
	border: 1px solid #ccc;
	padding: 8px;
	background-color: #f9f9f9;
`;
