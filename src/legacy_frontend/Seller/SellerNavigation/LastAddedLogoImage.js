import { useEffect, useState } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import { useCartContext } from "../../cart_context";
import { isAuthenticated } from "../../auth";

const LastAddedLogoImage = () => {
	const [logoUrl, setLogoUrl] = useState("");

	const { websiteSetup } = useCartContext();

	useEffect(() => {
		const nextLogoUrl = websiteSetup?.sereneJannatLogo?.url || "";
		setLogoUrl(nextLogoUrl);
	}, [websiteSetup]);

	const hasLogo = Boolean(websiteSetup?.sereneJannatLogo?.url && logoUrl);

	return (
		<LastAddedLogoImageWrapper
			onClick={() => {
				if (
					isAuthenticated() &&
					isAuthenticated().user &&
					isAuthenticated().user.role === 1
				) {
					window.location.href = "/admin/dashboard?tab=allStores";
				} else {
					window.location.href = "/";
				}
			}}
		>
			{hasLogo ? (
				<Link to='/'>
					<img id='logoImage' src={logoUrl} alt='serenejannat.com' />
				</Link>
			) : null}
		</LastAddedLogoImageWrapper>
	);
};

export default LastAddedLogoImage;

const LastAddedLogoImageWrapper = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 10px;
	margin: 20px 0;
	background-color: grey;
	border-radius: 5px;

	@media (max-width: 750px) {
		display: none !important;
	}

	img {
		width: 90%;
		max-width: 200px;
		object-fit: cover;
		@media (max-width: 750px) {
			display: none !important;
		}
	}
`;
