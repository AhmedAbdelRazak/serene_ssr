import React, { useEffect, useState } from "react";
import styled from "styled-components";
import SellerNavbar from "../SellerNavigation/SellerNavbar";
import { isAuthenticated } from "../../auth";
import { getStoreManagement } from "../apiSeller";

// We'll create a separate child component to handle listing/creating coupons
import CouponListContent from "./CouponListContent";

import { Button, Spin } from "antd";
import { useHistory } from "react-router-dom";

const CouponManagementMain = () => {
	const [SellerMenuStatus, setSellerMenuStatus] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const [loading, setLoading] = useState(false);
	const [storeData, setStoreData] = useState(null);

	const { user, token } = isAuthenticated();
	const userId = user && user._id;

	const history = useHistory();

	// Collapse sidebar if screen is small, then check localStorage => fallback to API
	useEffect(() => {
		if (window.innerWidth <= 1000) {
			setCollapsed(true);
		}

		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);
				if (parsedData && parsedData._id) {
					// We have a valid store from local storage
					setStoreData(parsedData);
				} else {
					// Otherwise fallback
					fetchStoreData();
				}
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				fetchStoreData(); // fallback
			}
		} else {
			// If none in localStorage, fetch from API
			fetchStoreData();
		}
		// eslint-disable-next-line
	}, []);

	const fetchStoreData = () => {
		setLoading(true);
		getStoreManagement(userId, token)
			.then((res) => {
				setLoading(false);
				// If there's no error and we get an _id, it means a store was found
				if (res && !res.error && res._id) {
					setStoreData(res);
				} else {
					setStoreData(null);
				}
			})
			.catch(() => {
				setLoading(false);
				setStoreData(null);
			});
	};

	const handleGoToStoreManagement = () => {
		history.push("/seller/store-management?tab=storeLogo");
	};

	return (
		<CouponManagementMainWrapper collapsed={collapsed}>
			<div className='grid-container-main'>
				<div className='navcontent'>
					<SellerNavbar
						fromPage='CouponManagement'
						SellerMenuStatus={SellerMenuStatus}
						setSellerMenuStatus={setSellerMenuStatus}
						collapsed={collapsed}
						setCollapsed={setCollapsed}
					/>
				</div>

				<div className='otherContentWrapper'>
					<div className='container-wrapper'>
						<h2>Coupon Management</h2>

						{loading ? (
							<Spin spinning tip='Loading Store...'>
								<div style={{ minHeight: 120 }} />
							</Spin>
						) : storeData && storeData._id ? (
							// If store is found, render the coupon table/form
							<CouponListContent storeId={storeData._id} />
						) : (
							// If no store found, show a message + button
							<div style={{ marginTop: 20 }}>
								<p>
									Please add your store settings first before managing coupons.
								</p>
								<Button type='primary' onClick={handleGoToStoreManagement}>
									Click here to proceed
								</Button>
							</div>
						)}
					</div>
				</div>
			</div>
		</CouponManagementMainWrapper>
	);
};

export default CouponManagementMain;

/* ====== STYLES ====== */
const CouponManagementMainWrapper = styled.div`
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
