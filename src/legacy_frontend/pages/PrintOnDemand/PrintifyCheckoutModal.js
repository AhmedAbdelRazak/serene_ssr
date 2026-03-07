// src/components/PrintifyCheckoutModal.js

import React from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import {
	Modal,
	Button,
	Typography,
	List,
	Image,
	Divider,
	message,
	Row,
	Col,
	Input,
	Select,
} from "antd";
import axios from "axios";

const { Title, Text } = Typography;
const { Option } = Select;

const PrintifyCheckoutModal = ({
	open,
	visible,
	onClose,
	order,
	setOrder,
	product,
}) => {
	const modalOpen = typeof open === "boolean" ? open : !!visible;

	/**
	 * Helper function to calculate total price
	 * - Variant price + $5 per text + $10 per image
	 */
	const getTotalPrice = () => {
		// Find the variant based on variant_id
		const variant = product.variants.find((v) => v.id === order.variant_id);

		// If variant not found, assume base price or $0
		const variantPrice = variant
			? parseFloat(variant.price / 100) // Assuming price is in cents
			: parseFloat(product.basePrice / 100) || 0;

		const textPrice = 5.0 * order.customizations.texts.length;
		const imagePrice = 10.0 * order.customizations.images.length;
		return variantPrice + textPrice + imagePrice;
	};

	const handleProceedToPayment = async () => {
		// Basic checks
		if (!order.variant_id) {
			message.error("Please select a variant first");
			return;
		}

		if (!order.recipient || !order.recipient.name) {
			message.error("Please fill in shipping details");
			return;
		}

		// Build the print_areas structure
		const frontLayers = [];

		// add text layers
		order.customizations.texts.forEach((txt, i) => {
			frontLayers.push({
				id: `text-${i}`,
				type: "text/plain",
				input_text: txt.text,
				font_color: txt.color,
				font_family: txt.font_family,
				font_size: txt.font_size,
				font_weight: txt.font_weight,
				font_style: txt.font_style,
				x: (txt.position.x / 600).toFixed(2),
				y: (txt.position.y / 600).toFixed(2),
				scale: 1,
				angle: 0,
			});
		});

		// add image layers
		order.customizations.images.forEach((img, i) => {
			frontLayers.push({
				id: `image-${i}`,
				type: "image/png",
				src: img.image_url,
				x: (img.position.x / 600).toFixed(2),
				y: (img.position.y / 600).toFixed(2),
				scale: 1,
				angle: 0,
			});
		});

		// final payload
		const payload = {
			blueprint_id: product.blueprint_id, // from your product data
			print_provider_id: product.print_provider_id,
			variant_id: order.variant_id,
			quantity: 1, // or user can pick

			// shipping method integer
			shipping_method: 1,

			address_to: {
				first_name: order.recipient.name.split(" ")[0] || "John",
				last_name: order.recipient.name.split(" ").slice(1).join(" ") || "Doe",
				email: order.recipient.email,
				phone: order.recipient.phone,
				country: order.recipient.country,
				region: order.recipient.state || "",
				address1: order.recipient.address1,
				address2: "",
				city: order.recipient.city,
				zip: order.recipient.zip,
			},

			external_id: `custom-${Date.now()}`, // optional

			print_areas: {
				front: frontLayers,
			},
		};

		try {
			const { data } = await axios.post(
				`${process.env.REACT_APP_API_URL}/create-custom-order`,
				payload
			);
			message.success("Order created successfully");
			onClose();
			console.log("Printify response:", data);
		} catch (err) {
			console.error("Order creation error:", err);
			message.error("Failed to create custom order");
		}
	};

	return (
		<Modal
			title='Review Your Order'
			open={modalOpen}
			onCancel={onClose}
			footer={[
				<Button key='back' onClick={onClose}>
					Cancel
				</Button>,
				<Button key='submit' type='primary' onClick={handleProceedToPayment}>
					Proceed to Payment
				</Button>,
			]}
			width={800}
		>
			<OrderReviewContainer>
				{/* Product Details */}
				<Title level={4}>Product Details</Title>
				<ProductInfo>
					<Image src={product.images[0].src} alt={product.title} width={200} />
					<div>
						<Text strong>{product.title}</Text>
						<List>
							<List.Item>
								<Text>Variant ID: {order.variant_id}</Text>
							</List.Item>
							{/* Add more product details if necessary */}
						</List>
					</div>
				</ProductInfo>

				<Divider />

				{/* Customizations */}
				<Title level={4}>Customizations</Title>
				<Customizations>
					<Title level={5}>Texts</Title>
					{order.customizations.texts.length > 0 ? (
						<List
							dataSource={order.customizations.texts}
							renderItem={(item, index) => (
								<List.Item key={index}>
									<Text>Text: {item.text}</Text>
									<Text>Color: {item.color}</Text>
									<Text>Font: {item.font_family}</Text>
									<Text>Size: {item.font_size}px</Text>
								</List.Item>
							)}
						/>
					) : (
						<Text>No text customizations added.</Text>
					)}

					<Title level={5} style={{ marginTop: 16 }}>
						Images
					</Title>
					{order.customizations.images.length > 0 ? (
						<List
							grid={{ gutter: 16, column: 4 }}
							dataSource={order.customizations.images}
							renderItem={(item, index) => (
								<List.Item key={index}>
									<Image
										src={item.image_url}
										alt={`Custom Image ${index + 1}`}
										width={150}
									/>
									<Text>
										Size: {item.width}x{item.height}px
									</Text>
								</List.Item>
							)}
						/>
					) : (
						<Text>No image customizations added.</Text>
					)}
				</Customizations>

				<Divider />

				{/* Recipient Information Form */}
				<Title level={4}>Recipient Information</Title>
				<Row gutter={8}>
					<Col span={24}>
						<Input
							placeholder='Full Name'
							value={order.recipient.name}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, name: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={24}>
						<Input
							placeholder='Address Line 1'
							value={order.recipient.address1}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: {
										...prev.recipient,
										address1: e.target.value,
									},
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='City'
							value={order.recipient.city}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, city: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='State/Province'
							value={order.recipient.state}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, state: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='ZIP/Postal Code'
							value={order.recipient.zip}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, zip: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='Country'
							value={order.recipient.country}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, country: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='Phone Number'
							value={order.recipient.phone}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, phone: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={12}>
						<Input
							placeholder='Email Address'
							value={order.recipient.email}
							onChange={(e) =>
								setOrder((prev) => ({
									...prev,
									recipient: { ...prev.recipient, email: e.target.value },
								}))
							}
						/>
					</Col>
					<Col span={24}>
						<Select
							style={{ width: "100%" }}
							placeholder='Shipping Method'
							value={order.shipping_method}
							onChange={(value) =>
								setOrder((prev) => ({
									...prev,
									shipping_method: value,
								}))
							}
						>
							<Option value='standard'>Standard Shipping</Option>
							<Option value='express'>Express Shipping</Option>
							{/* Add more shipping methods as per Printify's offerings */}
						</Select>
					</Col>
				</Row>

				<Divider />

				{/* Total Price */}
				<Title level={4}>Total Price</Title>
				<Text strong style={{ fontSize: "1.2rem" }}>
					{`$${getTotalPrice().toFixed(2)}`}
				</Text>
			</OrderReviewContainer>
		</Modal>
	);
};

PrintifyCheckoutModal.propTypes = {
	open: PropTypes.bool,
	visible: PropTypes.bool,
	onClose: PropTypes.func.isRequired,
	order: PropTypes.object.isRequired,
	setOrder: PropTypes.func.isRequired,
	product: PropTypes.object.isRequired,
};

export default PrintifyCheckoutModal;

/* Styled Components */

const OrderReviewContainer = styled.div`
	padding: 16px;
`;

const ProductInfo = styled.div`
	display: flex;
	gap: 16px;
`;

const Customizations = styled.div`
	padding: 8px 0;
`;
