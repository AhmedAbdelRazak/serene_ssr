import React, { useEffect, useState } from "react";
import styled from "styled-components";
import SellerNavbar from "../SellerNavigation/SellerNavbar";
import { isAuthenticated } from "../../auth";

const PrintifyManagementMain = () => {
	const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);

	// Auth
	const { user, token } = isAuthenticated();
	const userId = user && user._id;

	// Collapse sidebar if screen is small
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}
		// eslint-disable-next-line
	}, []);

	return (
		<PrintifyManagementMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<SellerNavbar
						fromPage='PrintifyManagement'
						SellerMenuStatus={SellerMenuStatus}
						setSellerMenuStatus={setSellerMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<h2>Printify Management</h2>

						<div>
							Serene Jannat Team is working on the printify integration module
							at the moment, once done, Serene Jannat team will notify you!
						</div>
					</div>
				</div>
			</div>
		</PrintifyManagementMainWrapper>
	);
};

export default PrintifyManagementMain;

/* ====== STYLES ====== */

const PrintifyManagementMainWrapper = styled.div`
	overflow-x: hidden;
	margin-top: 80px;
	min-height: 715px;

	.grid-container-main {
		display: grid;
		grid-template-columns: ${(props) =>
			props.collapsed ? "5% 95%" : "17% 83%"};
	}

	.container-wrapper {
		border: 2px solid var(--border-color-light);
		padding: 20px;
		border-radius: 20px;
		background: white;
		margin: 0 10px;
		transition: var(--main-transition);
	}

	@media (max-width: 1000px) {
		.grid-container-main {
			grid-template-columns: 100%;
		}
	}
`;
