import React, { useState, useEffect } from "react";
import { Modal, Input, Button, Select, Divider } from "antd";
import { getProducts, getColors, updatingAnOrderSeller } from "../apiSeller";
import { isAuthenticated } from "../../auth";
import { toast } from "react-toastify";
import { FiTrash2, FiPlusSquare, FiRefreshCw } from "react-icons/fi";

const { Option } = Select;

const ProductEditModal = ({
	isVisible,
	product,
	order,
	onCancel,
	onUpdate,
	setIsVisible,
	setIsVisibleMain,
}) => {
	const [action, setAction] = useState("");
	const [quantity, setQuantity] = useState(0);
	const [newProductId, setNewProductId] = useState("");
	const [allProducts, setAllProducts] = useState([]);
	const [chosenAttributes, setChosenAttributes] = useState({});
	// eslint-disable-next-line
	const [unitPrice, setUnitPrice] = useState(0);
	const [productColors, setProductColors] = useState([]);
	const [productSizes, setProductSizes] = useState([]);
	const [allColors, setAllColors] = useState([]);

	const { user, token } = isAuthenticated();

	useEffect(() => {
		getProducts().then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllProducts(data);
			}
		});
		getColors().then((data) => {
			if (data.error) {
				console.log(data.error);
			} else {
				setAllColors(data);
			}
		});
	}, []);

	useEffect(() => {
		if (newProductId) {
			const newProduct = allProducts.find((p) => p._id === newProductId);
			if (newProduct) {
				const uniqueColors = [
					...new Set(newProduct.productAttributes.map((attr) => attr.color)),
				];
				const uniqueSizes = [
					...new Set(newProduct.productAttributes.map((attr) => attr.size)),
				];
				setProductColors(uniqueColors);
				setProductSizes(uniqueSizes);
			}
		}
	}, [newProductId, allProducts]);

	useEffect(() => {
		if (newProductId) {
			const newProduct = allProducts.find((p) => p._id === newProductId);
			if (
				newProduct &&
				newProduct.addVariables &&
				chosenAttributes.color &&
				chosenAttributes.size
			) {
				const attribute = newProduct.productAttributes.find(
					(attr) =>
						attr.color === chosenAttributes.color &&
						attr.size === chosenAttributes.size
				);
				if (attribute) {
					setUnitPrice(attribute.price);
				}
			}
		}
	}, [newProductId, chosenAttributes, allProducts]);

	const handleSubmit = async () => {
		try {
			let productData = {
				productId: product.productId,
				ordered_quantity: quantity,
				chosenAttributes: product.chosenAttributes,
				price: product.price,
				image: product.image,
				priceAfterDiscount: product.priceAfterDiscount,
				MSRP: product.MSRP,
				WholeSalePrice: product.WholeSalePrice,
				DropShippingPrice: product.DropShippingPrice,
				receivedQuantity: product.receivedQuantity || 0,
				quantity: product.quantity,
				name: product.name,
			};

			if (action === "remove") {
				await updatingAnOrderSeller(order._id, user._id, token, {
					order,
					updateType: "remove",
					product: productData,
				});
			} else if (action === "addUnits") {
				await updatingAnOrderSeller(order._id, user._id, token, {
					order,
					updateType: "addUnits",
					product: { ...productData, added_quantity: quantity },
				});
			} else if (action === "addProduct") {
				const newProduct = allProducts.find((p) => p._id === newProductId);
				let newProdData = {};
				if (newProduct.addVariables) {
					const chosenAttribute = newProduct.productAttributes.find(
						(attr) =>
							attr.color === chosenAttributes.color &&
							attr.size === chosenAttributes.size
					);
					const image =
						newProduct.productAttributes
							.filter((attr) => attr.color === chosenAttributes.color)
							.filter(
								(attr) => attr.productImages && attr.productImages.length > 0
							)[0]?.productImages[0]?.url ||
						newProduct.thumbnailImage[0].images[0].url;

					newProdData = {
						productId: newProduct._id,
						name: newProduct.productName,
						ordered_quantity: quantity,
						price: chosenAttribute.price,
						image: image,
						chosenAttributes: chosenAttribute,
					};
				} else {
					newProdData = {
						productId: newProduct._id,
						name: newProduct.productName,
						ordered_quantity: quantity,
						price: newProduct.priceAfterDiscount,
						image: newProduct.thumbnailImage[0].images[0].url,
					};
				}
				await updatingAnOrderSeller(order._id, user._id, token, {
					order,
					updateType: "addProduct",
					product: newProdData,
				});
			} else if (action === "exchange") {
				const newProduct = allProducts.find((p) => p._id === newProductId);
				let newProductData;
				if (newProduct.addVariables) {
					const chosenAttribute = newProduct.productAttributes.find(
						(attr) =>
							attr.color === chosenAttributes.color &&
							attr.size === chosenAttributes.size
					);
					const image =
						newProduct.productAttributes
							.filter((attr) => attr.color === chosenAttributes.color)
							.filter(
								(attr) => attr.productImages && attr.productImages.length > 0
							)[0]?.productImages[0]?.url ||
						newProduct.thumbnailImage[0].images[0].url;

					newProductData = {
						productId: newProduct._id,
						name: newProduct.productName,
						ordered_quantity: product.ordered_quantity,
						price: chosenAttribute.price,
						image: image,
						chosenAttributes: chosenAttribute,
					};
				} else {
					newProductData = {
						productId: newProduct._id,
						name: newProduct.productName,
						ordered_quantity: product.ordered_quantity,
						price: newProduct.priceAfterDiscount,
						image: newProduct.thumbnailImage[0].images[0].url,
					};
				}
				await updatingAnOrderSeller(order._id, user._id, token, {
					order,
					updateType: "exchange",
					product: {
						oldProduct: productData,
						newProduct: newProductData,
					},
				});
			}

			toast.success("Order Successfully Updated");
			setIsVisible(false);
			setIsVisibleMain(false);
		} catch (error) {
			console.error("Error updating order:", error);
			toast.error("Failed to update order");
		}
	};

	const handleAttributeChange = (value, type) => {
		const newProduct = allProducts.find((p) => p._id === newProductId);
		if (newProduct) {
			let updatedAttributes = { ...chosenAttributes, [type]: value };
			if (type === "color" || type === "size") {
				const selectedAttribute = newProduct.productAttributes.find(
					(attr) =>
						attr.color ===
							(type === "color" ? value : chosenAttributes.color) &&
						attr.size === (type === "size" ? value : chosenAttributes.size)
				);
				if (selectedAttribute) {
					updatedAttributes = selectedAttribute;
				}
			}
			setChosenAttributes(updatedAttributes);
		}
	};

	return (
		<Modal
			title='Edit Product'
			open={isVisible}
			onCancel={onCancel}
			footer={[
				<Button key='cancel' onClick={onCancel}>
					Cancel
				</Button>,
				<Button key='submit' type='primary' onClick={handleSubmit}>
					Save
				</Button>,
			]}
		>
			<Divider orientation='left' style={{ fontSize: "14px" }}>
				Choose an Action
			</Divider>

			<Select
				placeholder='Select Action'
				value={action}
				onChange={setAction}
				style={{ width: "100%", marginBottom: "10px" }}
			>
				<Option value='remove'>
					<FiTrash2 style={{ marginRight: 5 }} />
					Remove Product
				</Option>
				<Option value='addUnits'>
					<FiPlusSquare style={{ marginRight: 5 }} />
					Add Units
				</Option>
				<Option value='addProduct'>
					<FiPlusSquare style={{ marginRight: 5 }} />
					Add New Product
				</Option>
				<Option value='exchange'>
					<FiRefreshCw style={{ marginRight: 5 }} />
					Exchange Product
				</Option>
			</Select>

			{(action === "addUnits" || action === "remove") && (
				<>
					{action === "addUnits" && (
						<Input
							placeholder='Enter Quantity'
							type='number'
							value={quantity}
							onChange={(e) => setQuantity(Number(e.target.value))}
							style={{ marginBottom: "10px" }}
						/>
					)}
					{/* 
            If "remove", user might not need to set quantity because "remove" 
            just means remove that entire product from the order. 
            But you can handle it if you want partial removal logic. 
          */}
				</>
			)}

			{(action === "addProduct" || action === "exchange") && (
				<>
					<Divider orientation='left' style={{ fontSize: "14px" }}>
						{action === "addProduct" ? "Add a New Product" : "Exchange Product"}
					</Divider>

					<Select
						showSearch
						placeholder='Select Product'
						value={newProductId}
						onChange={setNewProductId}
						style={{ width: "100%", marginBottom: "10px" }}
						filterOption={(input, option) =>
							option.children.toLowerCase().includes(input.toLowerCase())
						}
					>
						{allProducts.map((p) => (
							<Option key={p._id} value={p._id}>
								{p.productName}
							</Option>
						))}
					</Select>

					{newProductId && (
						<>
							{allProducts.find((p) => p._id === newProductId)
								?.addVariables && (
								<>
									<Select
										showSearch
										placeholder='Select Color'
										value={chosenAttributes.color}
										onChange={(value) => handleAttributeChange(value, "color")}
										style={{ width: "100%", marginBottom: "10px" }}
										filterOption={(input, option) =>
											option.children
												.toLowerCase()
												.includes(input.toLowerCase())
										}
									>
										{productColors.map((cc, ii) => {
											const colorName = allColors.find(
												(clr) => clr.hexa === cc
											)?.color;
											return (
												<Option key={ii} value={cc}>
													{colorName || cc}
												</Option>
											);
										})}
									</Select>
									<Select
										showSearch
										placeholder='Select Size'
										value={chosenAttributes.size}
										onChange={(value) => handleAttributeChange(value, "size")}
										style={{ width: "100%", marginBottom: "10px" }}
										filterOption={(input, option) =>
											option.children
												.toLowerCase()
												.includes(input.toLowerCase())
										}
									>
										{productSizes.map((ss, ii) => (
											<Option key={ii} value={ss}>
												{ss}
											</Option>
										))}
									</Select>
								</>
							)}

							<Input
								placeholder='Enter Quantity'
								type='number'
								value={quantity}
								onChange={(e) => setQuantity(Number(e.target.value))}
								style={{ marginBottom: "10px" }}
							/>
						</>
					)}
				</>
			)}
		</Modal>
	);
};

export default ProductEditModal;
