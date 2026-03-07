import React, { useEffect, useState } from "react";
import styled from "styled-components";
import axios from "axios";
import { Table, Tag, Button, Modal, Spin } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";

const { confirm } = Modal;

const AllStoresForAdmin = () => {
	const [sellers, setSellers] = useState([]); // Raw array of users with role=2000
	const [loading, setLoading] = useState(false);
	const { user, token } = isAuthenticated();
	const adminId = user._id;

	// 1) Fetch sellers & stores on mount
	useEffect(() => {
		loadAllSellersWithStores();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const loadAllSellersWithStores = async () => {
		try {
			setLoading(true);
			const { data } = await axios.get(
				`${process.env.REACT_APP_API_URL}/all-user-store-management/foradmin/${adminId}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			setSellers(data); // data is an array of seller objects
		} catch (error) {
			console.error("Error fetching sellers/stores:", error);
		} finally {
			setLoading(false);
		}
	};

	// 2) Flatten each seller’s stores into table rows
	const tableData = sellers.reduce((acc, seller) => {
		if (!seller.storeIds || seller.storeIds.length === 0) {
			return acc; // no stores
		}
		const rows = seller.storeIds.map((store) => ({
			key: store._id, // for Ant Table
			sellerName: seller.name,
			sellerEmail: seller.email,
			storeId: store._id,
			storeName: store.addStoreName?.trim() || "N/A",
			hasLogo: store.storeLogo?.url ? true : false,
			isActiveByAdmin: store.activeStoreByAdmin,
			fullStore: store, // entire StoreManagement object
		}));
		return [...acc, ...rows];
	}, []);

	// 3) Show details => store entire store object in localStorage, wait 1s, redirect
	const handleShowDetails = (record) => {
		const { storeId, fullStore } = record;

		// Store ID if still needed
		localStorage.setItem("storeId", storeId);

		// Store the entire store object in localStorage
		localStorage.setItem("storeData", JSON.stringify(fullStore));

		// Show spinner (table is replaced by spinner) for 1s
		setLoading(true);
		setTimeout(() => {
			setLoading(false);
			window.location.href = "/seller/dashboard";
			// or use: history.push("/seller/dashboard");
		}, 1000);
	};

	// 4) Confirm (Activate/Deactivate) with antd Modal
	const confirmToggleStore = (record) => {
		const { storeId, isActiveByAdmin } = record;
		const nextState = !isActiveByAdmin; // toggling
		confirm({
			title: nextState ? "Activate Store" : "Deactivate Store",
			icon: <ExclamationCircleOutlined />,
			content: nextState
				? "Are you sure you want to activate this store?"
				: "Are you sure you want to deactivate this store?",
			onOk: () => toggleStoreActivationByAdmin(storeId, nextState),
		});
	};

	// 5) Call backend route to toggle store activation
	const toggleStoreActivationByAdmin = async (storeId, activeStoreByAdmin) => {
		try {
			setLoading(true);
			await axios.put(
				`${process.env.REACT_APP_API_URL}/all-user-store-management/foradmin/activate/${storeId}/${adminId}`,
				{ activeStoreByAdmin },
				{
					headers: {
						Authorization: `Bearer ${token}`,
					},
				}
			);
			// Re-fetch or update local state
			loadAllSellersWithStores();
		} catch (error) {
			console.error("Error toggling store activation:", error);
		} finally {
			setLoading(false);
		}
	};

	// 6) Define table columns
	const columns = [
		{
			title: "Seller Name",
			dataIndex: "sellerName",
			key: "sellerName",
		},
		{
			title: "Email",
			dataIndex: "sellerEmail",
			key: "sellerEmail",
		},
		{
			title: "Logo Added?",
			dataIndex: "hasLogo",
			key: "hasLogo",
			render: (hasLogo) =>
				hasLogo ? <Tag color='green'>Yes</Tag> : <Tag color='red'>No</Tag>,
		},
		{
			title: "Store Name",
			dataIndex: "storeName",
			key: "storeName",
			render: (storeName) =>
				storeName === "N/A" ? <Tag color='volcano'>N/A</Tag> : storeName,
		},
		{
			title: "Activate/Deactivate",
			key: "activateDeactivate",
			render: (text, record) => {
				return (
					<Button
						style={{
							background: record.isActiveByAdmin ? "darkred" : "darkgreen",
							color: "white",
						}}
						onClick={() => confirmToggleStore(record)}
					>
						{record.isActiveByAdmin ? "Deactivate" : "Activate"}
					</Button>
				);
			},
		},
		{
			title: "Action",
			key: "action",
			render: (text, record) => {
				return (
					<Button onClick={() => handleShowDetails(record)}>
						Show Details...
					</Button>
				);
			},
		},
	];

	return (
		<AllStoresForAdminWrapper>
			<h2>All Stores / Brands</h2>

			{loading ? (
				<div className='loading-spinner'>
					<Spin size='large' />
				</div>
			) : (
				<Table
					columns={columns}
					dataSource={tableData}
					pagination={{ pageSize: 6 }}
					bordered
				/>
			)}
		</AllStoresForAdminWrapper>
	);
};

export default AllStoresForAdmin;

/** =================== Styles =================== **/
const AllStoresForAdminWrapper = styled.div`
	padding: 2rem;
	background: #fff;
	border-radius: 8px;

	h2 {
		margin-bottom: 1.5rem;
		font-weight: bold;
	}

	.loading-spinner {
		text-align: center;
		margin: 2rem 0;
	}
`;
