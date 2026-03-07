import React, { useRef } from "react";
import styled from "styled-components";

const Z2Search = () => {
	const searchInputRef = useRef(null);

	const focusSearchInput = () => {
		searchInputRef.current.focus();
	};

	return (
		<Container>
			<Searchbar onClick={focusSearchInput}>
				<LogoContainer>
					<Logo
						loading='lazy'
						src='https://cdn.builder.io/api/v1/image/assets/TEMP/dd0803775105240f45b4c613f6145f8bc34a373b6996712b78d9f0ddb6306384?apiKey=cdf657c2c4874b31988402beb4ed56ad&'
					/>
					<SearchInput ref={searchInputRef} placeholder='Search' />
				</LogoContainer>
				<IconSearch
					loading='lazy'
					src='https://cdn.builder.io/api/v1/image/assets/TEMP/740c27ac0f4f2c8c05b66d9a6fe5f984c5284a752be7078ae1c0c43f44ea39fc?apiKey=cdf657c2c4874b31988402beb4ed56ad&'
				/>
			</Searchbar>
		</Container>
	);
};

export default Z2Search;

const Container = styled.div`
	margin-bottom: 50px;
`;

const Searchbar = styled.div`
	border-radius: 14px;
	background-color: white;
	border: 1px solid var(--border-color-light);
	display: flex;
	align-items: center;
	width: 50%;
	justify-content: space-between;
	font-size: 14px;
	color: var(--neutral-medium);
	font-weight: 400;
	white-space: nowrap;
	padding: 14px 16px;
	cursor: text;
	transition: var(--main-transition);
	text-align: center;
	margin: auto;

	&:hover {
		background-color: var(--neutral-light);
		color: var(--text-color-light);
	}

	@media (max-width: 800px) {
		width: 90%;
	}
`;

const LogoContainer = styled.div`
	display: flex;
	align-items: center;
`;

const Logo = styled.img`
	margin-right: 20px;
`;

const SearchInput = styled.input`
	border: none;
	outline: none;
	flex-grow: 1;
	font-size: 14px;
	color: var(--neutral-medium);
	background-color: transparent;

	&::placeholder {
		color: var(--neutral-medium);
	}
`;

const IconSearch = styled.img`
	cursor: pointer;
	transition: var(--main-transition);

	&:hover {
		transform: scale(1.1);
	}
`;
