/** @format */

import React from "react";
import styled from "styled-components";
import { Helmet } from "react-helmet-async";
import { useCartContext } from "../cart_context";
import { useLegacySeoEnabled } from "../bootstrap/legacySeo";

const ReturnRefundPolicy = () => {
	const { websiteSetup } = useCartContext();
	const legacySeoEnabled = useLegacySeoEnabled();

	const title = "Return and Refund Policy | Serene Jannat";
	const description =
		"Learn about the returns and refund practices of Serene Jannat, your trusted online gift store for candles, glass items, and more.";
	const url = "https://serenejannat.com/return-refund-policy";
	const keywords =
		"Returns, Refunds, Exchange, Terms and Conditions, Serene Jannat, Online Shop, Candles, Gifts, blown glasses, decoration";

	return (
		<Wrapper>
			{legacySeoEnabled ? <Helmet>
				<title>{title}</title>
				<meta name='description' content={description} />
				<meta name='keywords' content={keywords} />
				<meta property='og:title' content={title} />
				<meta property='og:description' content={description} />
				<meta property='og:url' content={url} />
				<link
					rel='canonical'
					href='https://serenejannat.com/return-refund-policy'
				/>
				<meta property='og:type' content='website' />
			</Helmet> : null}
			<ContentWrapper>
				{websiteSetup && websiteSetup.returnsAndRefund && (
					<DescriptionWrapper>
						<div
							dangerouslySetInnerHTML={{
								__html: websiteSetup.returnsAndRefund,
							}}
						/>
					</DescriptionWrapper>
				)}
			</ContentWrapper>
		</Wrapper>
	);
};

const Wrapper = styled.div`
	background-color: var(--neutral-light);
	display: flex;
	justify-content: center;
	padding: 40px 20px;
	box-sizing: border-box;
	min-height: 100vh;

	ul,
	ol {
		margin-left: ${(props) => (props.isArabic ? "" : "1.5em")};
		padding-left: ${(props) => (props.isArabic ? "" : "1.5em")};

		margin-right: ${(props) => (props.isArabic ? "1.5em" : "")};
		padding-right: ${(props) => (props.isArabic ? "1.5em" : "")};
	}

	h2 {
		font-weight: bold;
	}

	@media (max-width: 800px) {
		h1 > strong {
			font-size: 1.8rem !important;
		}

		h2 {
			font-size: 1.3rem;
			font-weight: bold;
		}

		ul,
		ol {
			margin-left: ${(props) => (props.isArabic ? "" : "1em")};
			padding-left: ${(props) => (props.isArabic ? "" : "1em")};
			margin-right: ${(props) => (props.isArabic ? "1em" : "")};
			padding-right: ${(props) => (props.isArabic ? "1em" : "")};
		}
	}
`;

const ContentWrapper = styled.div`
	//Old styling
	display: flex;
	flex-direction: column;
	width: 100%;
	max-width: 800px;
	background: white;
	padding: 40px;
	box-shadow: var(--box-shadow-light);
	border-radius: 8px;

	h1 {
		color: var(--text-color-dark);
		font-family: "SF Pro Display", sans-serif;
		font-size: 24px;
		font-weight: bold;
		margin-bottom: 20px;
		text-align: center;
	}

	h2 {
		color: var(--text-color-secondary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 18px;
		font-weight: 600;
		margin-bottom: 10px;
		text-align: center;
	}

	h3 {
		color: var(--text-color-primary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 20px;
		font-weight: 600;
		margin-top: 20px;
		margin-bottom: 10px;
	}

	h4 {
		color: var(--text-color-secondary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 16px;
		font-weight: 600;
		margin-top: 15px;
		margin-bottom: 10px;
	}

	p {
		color: var(--text-color-primary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 16px;
		line-height: 1.2;
		margin-bottom: 20px;
	}

	ul {
		color: var(--text-color-primary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 16px;
		line-height: 1.1;
		margin-bottom: 20px;
		padding-left: 20px;

		li {
			margin-bottom: 0px;
		}
	}

	div {
		color: var(--text-color-primary);
		font-family: "SF Pro Display", sans-serif;
		font-size: 16px;
		line-height: 1.1;
		margin-bottom: 20px;
	}
`;

const DescriptionWrapper = styled.div`
	font-size: 1rem;
	line-height: 1.3;
	color: #333;

	img {
		width: 100%;
		height: auto;
		border-radius: 5px;
		max-height: 600px;
		object-fit: cover;
		padding: 0px !important;
		margin: 0px !important;
	}
`;

export default ReturnRefundPolicy;

