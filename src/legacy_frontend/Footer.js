/** @format */

import React from "react";
import styled from "styled-components";
import {
	FaFacebookF,
	FaTwitter,
	FaInstagram,
	FaLinkedinIn,
	FaYoutube,
} from "react-icons/fa";

const Footer = () => {
	const handleNavigation = (url) => {
		window.scrollTo({ top: 0, behavior: "smooth" });
		window.location.href = url;
	};

	return (
		<Wrapper>
			<ContentWrapper>
				<MenuWrapper>
					<MenuItem onClick={() => handleNavigation("/about")}>About</MenuItem>
					<MenuItem onClick={() => handleNavigation("/contact")}>
						Contact
					</MenuItem>
					<MenuItem onClick={() => handleNavigation("/our-products")}>
						Shop
					</MenuItem>
				</MenuWrapper>

				<SocialIcons>
					<Icon
						href='https://www.facebook.com/profile.php?id=61575325586166'
						target='_blank'
						aria-label='Facebook'
					>
						<FaFacebookF />
					</Icon>
					<Icon href='https://twitter.com' target='_blank' aria-label='Twitter'>
						<FaTwitter />
					</Icon>
					<Icon
						href='https://www.facebook.com/profile.php?id=61575325586166'
						target='_blank'
						aria-label='Instagram'
					>
						<FaInstagram />
					</Icon>
					<Icon
						href='https://linkedin.com'
						target='_blank'
						aria-label='LinkedIn'
					>
						<FaLinkedinIn />
					</Icon>
					<Icon href='https://youtube.com' target='_blank' aria-label='YouTube'>
						<FaYoutube />
					</Icon>
				</SocialIcons>

				<ContactInfo>
					sally.abdelrazak@serenejannat.com <br />
					(951) 565-7568
				</ContactInfo>

				{/* <Image
					loading='lazy'
					src='https://cdn.builder.io/api/v1/image/assets/TEMP/86ecccb2d8ca05a9530882de2f3aca37eb788e4c92d3bfb3274eac36bbc892d7?apiKey=cdf657c2c4874b31988402beb4ed56ad&'
				/> */}

				<Terms
					onClick={() => handleNavigation("/privacy-policy-terms-conditions")}
				>
					Serene Jannat | Terms & Conditions
				</Terms>
				<Terms onClick={() => handleNavigation("/return-refund-policy")}>
					Serene Jannat | Return & Refund Policy
				</Terms>

				<Copyright>
					Copyright©{new Date().getFullYear()} Serene Jannat All Rights
					Reserved.
				</Copyright>
			</ContentWrapper>
		</Wrapper>
	);
};

const Wrapper = styled.div`
	background-color: var(--neutral-dark);
	display: flex;
	justify-content: center;
	width: 100%;
	padding: 40px 20px;
	box-sizing: border-box;
`;

const ContentWrapper = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	width: 100%;
	max-width: 1200px;
`;

const MenuWrapper = styled.div`
	display: flex;
	gap: 20px;
	margin-bottom: 20px;
`;

const MenuItem = styled.div`
	color: var(--text-color-primary);
	font-family: "SF Pro Display", sans-serif;
	font-size: 16px;
	font-weight: 600;
	cursor: pointer;
	transition: color 0.3s;

	&:hover {
		color: var(--accent-color-1);
	}
`;

const SocialIcons = styled.div`
	display: flex;
	gap: 15px;
	margin-bottom: 20px;
`;

const Icon = styled.a`
	color: var(--primary-color);
	font-size: 24px;
	transition: color 0.3s;

	&:hover {
		color: var(--accent-color-1);
	}
`;

const ContactInfo = styled.div`
	color: var(--text-color-secondary);
	font-family: "SF Pro Display", sans-serif;
	font-size: 14px;
	line-height: 1.5;
	margin-bottom: 30px;
`;

// eslint-disable-next-line
const Image = styled.img`
	width: 132px;
	margin-bottom: 20px;
`;

const Terms = styled.div`
	color: var(--text-color-primary);
	font-family: "SF Pro Display", sans-serif;
	font-size: 14px;
	font-weight: 600;
	cursor: pointer;
	transition: color 0.3s;
	margin-bottom: 20px;

	&:hover {
		color: var(--accent-color-1);
	}
`;

const Copyright = styled.div`
	color: var(--text-color-secondary);
	font-family: "SF Pro Display", sans-serif;
	font-size: 12px;
`;

export default Footer;
