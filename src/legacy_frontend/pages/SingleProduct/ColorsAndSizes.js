import React from "react";
import styled from "styled-components";

const ColorsAndSizes = ({
	colors,
	sizes,
	selectedColor,
	selectedSize,
	handleColorChange,
	handleSizeChange,
}) => {
	return (
		<ColorsAndSizesWrapper>
			<ColorsWrapper>
				<Label>Colors:</Label>
				<OptionsWrapper>
					{colors.map((color) => (
						<ColorOption
							key={color.value}
							onClick={() => handleColorChange(color.value)}
							selected={selectedColor === color.value}
							color={color.value}
						>
							{color.name}
						</ColorOption>
					))}
				</OptionsWrapper>
			</ColorsWrapper>
			{sizes && sizes.length === 1 && sizes[0] === "nosizes" ? null : (
				<SizesWrapper>
					<Label>Sizes:</Label>
					<OptionsWrapper>
						{sizes.map((size) => (
							<SizeOption
								key={size}
								onClick={() => handleSizeChange(size)}
								selected={selectedSize === size}
							>
								{size}
							</SizeOption>
						))}
					</OptionsWrapper>
				</SizesWrapper>
			)}
		</ColorsAndSizesWrapper>
	);
};

export default ColorsAndSizes;

const ColorsAndSizesWrapper = styled.div`
	display: flex;
	flex-direction: column;
	margin-bottom: 20px;
`;

const ColorsWrapper = styled.div`
	margin-bottom: 10px;
`;

const SizesWrapper = styled.div``;

const Label = styled.label`
	font-weight: bold;
	margin-bottom: 5px;
	display: block;
`;

const OptionsWrapper = styled.div`
	display: flex;
	flex-wrap: wrap;
	margin-top: 5px;
`;

const Option = styled.button`
	margin: 5px;
	padding: 10px;
	border: 1px solid #ccc;
	border-radius: 5px;
	cursor: pointer;
	text-transform: capitalize;
	transition:
		background-color 0.3s,
		color 0.3s;

	&:hover {
		color: #fff;
	}
`;

const ColorOption = styled(Option)`
	background-color: ${({ selected, color }) => (selected ? color : "#fff")};
	color: ${({ selected }) => (selected ? "#fff" : "#000")};

	&:hover {
		background-color: ${({ color }) => color};
	}
`;

const SizeOption = styled(Option)`
	background-color: ${({ selected }) => (selected ? "#0c1d2d" : "#fff")};
	color: ${({ selected }) => (selected ? "#fff" : "#000")};

	&:hover {
		background-color: #0c1d2d;
	}
`;
