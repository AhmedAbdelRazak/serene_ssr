import React, { useEffect, useState } from "react";
import {
	Table,
	Button,
	Modal,
	Form,
	Input,
	InputNumber,
	Switch,
	message,
} from "antd";
import {
	createShippingOption,
	listShippingOptions,
	updateShippingOption,
	removeShippingOption,
} from "../apiSeller";
import { isAuthenticated } from "../../auth";

const ShippingOptionsContent = ({ storeId: propStoreId }) => {
	const [loading, setLoading] = useState(false);
	const [shippingOptions, setShippingOptions] = useState([]);
	const [visible, setVisible] = useState(false);
	const [editingShipping, setEditingShipping] = useState(null);

	// Form instance
	const [form] = Form.useForm();

	// Auth info
	const { user, token } = isAuthenticated();
	const defaultUserId = user && user._id;

	// We store the "final" userId (ownerId) and storeId in state,
	// which might come from local storage or from props/auth.
	const [ownerId, setOwnerId] = useState(defaultUserId);
	const [finalStoreId, setFinalStoreId] = useState(propStoreId);

	// 1. On mount, check if we have storeData in local storage
	useEffect(() => {
		const localStoreData = localStorage.getItem("storeData");
		if (localStoreData) {
			try {
				const parsedData = JSON.parse(localStoreData);

				// belongsTo can be a string or an object with { _id: ... }
				let localOwnerId = parsedData.belongsTo;
				if (typeof localOwnerId === "object" && localOwnerId._id) {
					localOwnerId = localOwnerId._id;
				}

				setOwnerId(localOwnerId);
				setFinalStoreId(parsedData._id); // override the prop
			} catch (err) {
				console.error("Error parsing storeData from localStorage:", err);
				// If parsing fails, fallback to defaults
			}
		}
	}, [defaultUserId, propStoreId]);

	// 2. Load shipping options whenever finalStoreId changes
	useEffect(() => {
		if (finalStoreId) {
			loadShippingOptions(finalStoreId);
		}
		// eslint-disable-next-line
	}, [finalStoreId]);

	// Load and filter shipping options for this store
	const loadShippingOptions = (storeId) => {
		setLoading(true);
		listShippingOptions()
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					// Filter shipping options for this specific store
					const filtered = res.filter((opt) => opt.store === storeId);
					setShippingOptions(filtered);
				} else {
					message.error(res?.error || "Failed to load shipping options");
				}
			})
			.catch((err) => {
				setLoading(false);
				console.error("Error loading shipping options:", err);
				message.error("Failed to load shipping options");
			});
	};

	// Open modal for create or edit
	const openModal = (shippingOption = null) => {
		setEditingShipping(shippingOption);
		if (shippingOption) {
			// Editing
			form.setFieldsValue(shippingOption);
		} else {
			// Creating new
			form.resetFields();
		}
		setVisible(true);
	};

	const handleCancel = () => {
		setVisible(false);
		setEditingShipping(null);
		form.resetFields();
	};

	// Create or Update
	const handleOk = () => {
		form.validateFields().then((values) => {
			// If editingShipping is null, we are creating a new record
			if (!editingShipping) {
				const payload = {
					...values,
					belongsTo: ownerId, // use our final owner ID
					store: finalStoreId, // link this shipping option to the final store
				};

				setLoading(true);
				createShippingOption(ownerId, token, payload)
					.then((res) => {
						setLoading(false);
						if (res && !res.error) {
							message.success("Created shipping option successfully!");
							setVisible(false);
							loadShippingOptions(finalStoreId);
						} else {
							message.error(res?.error || "Failed to create shipping option");
						}
					})
					.catch(() => {
						setLoading(false);
						message.error("Failed to create shipping option");
					});
			} else {
				// update existing
				const payload = {
					...values,
					_id: editingShipping._id, // keep the ID
					belongsTo: ownerId,
					store: finalStoreId,
				};

				setLoading(true);
				updateShippingOption(editingShipping._id, ownerId, token, payload)
					.then((res) => {
						setLoading(false);
						if (res && !res.error) {
							message.success("Updated shipping option successfully!");
							setVisible(false);
							loadShippingOptions(finalStoreId);
						} else {
							message.error(res?.error || "Failed to update shipping option");
						}
					})
					.catch(() => {
						setLoading(false);
						message.error("Failed to update shipping option");
					});
			}
		});
	};

	const handleDelete = (record) => {
		if (
			!window.confirm("Are you sure you want to delete this shipping option?")
		) {
			return;
		}
		setLoading(true);
		removeShippingOption(record._id, ownerId, token)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					message.success("Deleted shipping option successfully!");
					loadShippingOptions(finalStoreId);
				} else {
					message.error(res?.error || "Failed to delete shipping option");
				}
			})
			.catch(() => {
				setLoading(false);
				message.error("Failed to delete shipping option");
			});
	};

	const columns = [
		{
			title: "Carrier Name (English)",
			dataIndex: "carrierName",
		},
		{
			title: "Price",
			dataIndex: "shippingPrice",
			render: (text, record) => (
				<>
					{record.shippingPrice} {record.shippingPrice_Unit}
				</>
			),
		},
		{
			title: "Status",
			dataIndex: "carrierStatus",
			render: (val) => (val ? "Active" : "Inactive"),
		},
		{
			title: "Estimated (Days)",
			dataIndex: "estimatedDays",
		},
		{
			title: "Actions",
			render: (text, record) => (
				<>
					<Button type='link' onClick={() => openModal(record)}>
						Edit
					</Button>
					<Button type='link' danger onClick={() => handleDelete(record)}>
						Delete
					</Button>
				</>
			),
		},
	];

	return (
		<div>
			<div style={{ marginBottom: 10 }}>
				<Button
					type='primary'
					onClick={() => openModal()}
					disabled={!finalStoreId}
				>
					+ Add Shipping Option
				</Button>
			</div>

			<Table
				rowKey='_id'
				dataSource={shippingOptions}
				columns={columns}
				loading={loading}
			/>

			<Modal
				open={visible}
				onCancel={handleCancel}
				onOk={handleOk}
				title={editingShipping ? "Edit Shipping Option" : "Add Shipping Option"}
				okText={editingShipping ? "Update" : "Create"}
				confirmLoading={loading}
			>
				<Form form={form} layout='vertical'>
					<Form.Item
						name='carrierName'
						label='Carrier Name'
						rules={[
							{
								required: true,
								message: "Please enter carrier name e.g. ups 3 days",
							},
						]}
					>
						<Input placeholder='e.g. UPS 3 days' />
					</Form.Item>

					<Form.Item
						name='shippingPrice'
						label='Shipping Price (USD)'
						rules={[
							{ required: true, message: "Please enter the shipping price" },
						]}
					>
						<InputNumber placeholder='Only Digits' style={{ width: "100%" }} />
					</Form.Item>

					<Form.Item
						name='carrierStatus'
						label='Active?'
						valuePropName='checked'
					>
						<Switch />
					</Form.Item>

					<Form.Item name='estimatedDays' label='Estimated Delivery Days'>
						<InputNumber
							placeholder='Digits Only (e.g. 3 means 3 days)'
							style={{ width: "100%" }}
						/>
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};

export default ShippingOptionsContent;
