// src/components/SellerNavigation/SellerNotificationDropdown.js
import React from "react";
import styled from "styled-components";
import { useHistory } from "react-router-dom";

const SellerNotificationDropdown = ({ unseenCases, onClose }) => {
	const history = useHistory();

	// A helper function to figure out which tab is relevant based on openedBy
	const determineTab = (caseItem) => {
		if (caseItem.openedBy === "client") return "b2cActive";
		// If openedBy is "seller" or "super admin", consider it B2B
		return "b2bActive";
	};

	const handleCaseClick = (oneCase) => {
		// Decide which tab to navigate to
		const tab = determineTab(oneCase);

		// Build the URL: we push /seller/customer-service?tab={tab}&caseId={caseId}
		// We do not specify `history=b2c/b2b` for active chats, only for “history” tab if needed.
		// Because these are “unseen” => presumably they’re in active status.
		history.push(`/seller/customer-service?tab=${tab}&caseId=${oneCase._id}`);

		// Close the dropdown
		onClose();
	};

	return (
		<DropdownWrapper>
			<Title>Unseen Messages</Title>

			{unseenCases && unseenCases.length > 0 ? (
				unseenCases.map((oneCase) => {
					// Count how many unseen messages you want to display, or any info
					const unseenCount = oneCase.conversation?.length || 0; // from your aggregated data

					return (
						<Item key={oneCase._id} onClick={() => handleCaseClick(oneCase)}>
							<strong>{oneCase.displayName1}</strong>
							<small style={{ display: "block" }}>
								{unseenCount} unseen message(s)
							</small>
						</Item>
					);
				})
			) : (
				<NoMessages>No new notifications</NoMessages>
			)}
		</DropdownWrapper>
	);
};

export default SellerNotificationDropdown;

/* ========== STYLES ========== */
const DropdownWrapper = styled.div`
	position: absolute;
	top: 50px;
	right: 0;
	width: 280px;
	background: #fff;
	border-radius: 5px;
	border: 1px solid #ccc;
	z-index: 999;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
	padding: 10px;
`;

const Title = styled.h4`
	margin: 0;
	padding: 5px 0 10px 0;
	text-align: center;
	border-bottom: 1px solid #eee;
`;

const Item = styled.div`
	padding: 10px;
	border-bottom: 1px solid #eee;
	cursor: pointer;

	&:hover {
		background-color: #f5f5f5;
	}
`;

const NoMessages = styled.div`
	text-align: center;
	padding: 10px;
`;
