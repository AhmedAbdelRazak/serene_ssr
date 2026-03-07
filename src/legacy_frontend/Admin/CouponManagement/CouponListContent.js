// ========== CouponListContent.js ==========

import React, { useEffect, useState } from "react";
import {
	Table,
	Button,
	Modal,
	Form,
	Input,
	InputNumber,
	DatePicker,
	message,
} from "antd";
import moment from "moment";
import { isAuthenticated } from "../../auth";
import { listCoupons, createCoupon, removeCoupon } from "../apiAdmin";

const CouponListContent = ({ storeId }) => {
	const [coupons, setCoupons] = useState([]);
	const [loading, setLoading] = useState(false);

	// For modal form
	const [visible, setVisible] = useState(false);
	const [form] = Form.useForm();

	const { user, token } = isAuthenticated();
	const userId = user && user._id;

	useEffect(() => {
		fetchCoupons();
		// eslint-disable-next-line
	}, []);

	const fetchCoupons = () => {
		setLoading(true);
		listCoupons()
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					// Filter only coupons that match this storeId
					const filtered = res.filter((coupon) => coupon.store === storeId);
					setCoupons(filtered);
				} else {
					message.error(res.error || "Failed to load coupons");
				}
			})
			.catch(() => {
				setLoading(false);
				message.error("Failed to load coupons");
			});
	};

	const openModal = () => {
		form.resetFields();
		setVisible(true);
	};

	const handleCancel = () => {
		setVisible(false);
	};

	const handleOk = () => {
		form.validateFields().then((values) => {
			// Convert expiry from moment -> Date
			const { name, discount, expiry } = values;
			const payload = {
				name: name.toUpperCase(),
				discount: discount,
				expiry: expiry, // this is a moment object; we'll convert below
				store: storeId,
			};

			// Convert expiry to ISO date if needed
			if (expiry && expiry._isAMomentObject) {
				payload.expiry = expiry.toDate();
			}

			setLoading(true);
			createCoupon(userId, token, payload)
				.then((res) => {
					setLoading(false);
					if (res && !res.error) {
						message.success("Coupon created!");
						setVisible(false);
						fetchCoupons();
					} else {
						message.error(res.error || "Failed to create coupon");
					}
				})
				.catch(() => {
					setLoading(false);
					message.error("Failed to create coupon");
				});
		});
	};

	const handleDelete = (record) => {
		if (!window.confirm("Are you sure you want to delete this coupon?")) {
			return;
		}
		setLoading(true);
		removeCoupon(record._id, userId, token)
			.then((res) => {
				setLoading(false);
				if (res && !res.error) {
					message.success("Coupon removed");
					fetchCoupons();
				} else {
					message.error(res.error || "Failed to remove coupon");
				}
			})
			.catch(() => {
				setLoading(false);
				message.error("Failed to remove coupon");
			});
	};

	const columns = [
		{
			title: "Coupon Name",
			dataIndex: "name",
			key: "name",
		},
		{
			title: "Discount (%)",
			dataIndex: "discount",
			key: "discount",
		},
		{
			title: "Expiry Date",
			dataIndex: "expiry",
			key: "expiry",
			render: (value) => (value ? moment(value).format("YYYY-MM-DD") : "N/A"),
		},
		{
			title: "Actions",
			key: "actions",
			render: (text, record) => (
				<>
					<Button danger onClick={() => handleDelete(record)}>
						Delete
					</Button>
				</>
			),
		},
	];

	return (
		<div>
			<div style={{ marginBottom: 16 }}>
				<Button type='primary' onClick={openModal}>
					+ Create New Coupon
				</Button>
			</div>

			<Table
				rowKey='_id'
				dataSource={coupons}
				columns={columns}
				loading={loading}
			/>

			<Modal
				title='Create a New Coupon'
				open={visible}
				onCancel={handleCancel}
				onOk={handleOk}
				confirmLoading={loading}
			>
				<Form form={form} layout='vertical'>
					<Form.Item
						label='Coupon Name'
						name='name'
						rules={[
							{ required: true, message: "Please enter a coupon name" },
							{ min: 6, message: "Minimum length is 6 characters" },
						]}
					>
						<Input placeholder='e.g. SUMMER10' />
					</Form.Item>

					<Form.Item
						label='Discount (%)'
						name='discount'
						rules={[
							{ required: true, message: "Please enter discount amount" },
						]}
					>
						<InputNumber style={{ width: "100%" }} min={1} max={99} />
					</Form.Item>

					<Form.Item
						label='Expiry Date'
						name='expiry'
						rules={[
							{ required: true, message: "Please select an expiry date" },
						]}
					>
						<DatePicker style={{ width: "100%" }} />
					</Form.Item>
				</Form>
			</Modal>
		</div>
	);
};

export default CouponListContent;

