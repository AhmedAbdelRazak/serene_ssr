import React, { useState, useEffect } from "react";
import styled from "styled-components";
import axios from "axios";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Helmet } from "react-helmet-async";
import SquarePaymentForm from "./SquarePaymentForm";
import { getColors } from "../apiAdmin";

const LinkGenerated = () => {
	const { orderId } = useParams();
	const [order, setOrder] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [allColors, setAllColors] = useState([]);

	useEffect(() => {
		const fetchColors = async () => {
			try {
				const colors = await getColors();
				setAllColors(colors);
			} catch (error) {
				console.error("Failed to fetch colors", error);
			}
		};

		const fetchOrder = async () => {
			try {
				const response = await axios.get(
					`${process.env.REACT_APP_API_URL}/read-order/${orderId}`
				);
				setOrder(response.data);
				setIsLoading(false);
			} catch (error) {
				toast.error("Failed to fetch order details.");
				setIsLoading(false);
			}
		};

		fetchColors();
		fetchOrder();
	}, [orderId]);

	const handlePaymentSuccess = async (token) => {
		try {
			const response = await axios.post(
				`${process.env.REACT_APP_API_URL}/process-payment`,
				{
					orderId,
					token,
					zipCode: order.customerDetails.zipcode,
				}
			);

			if (response.data.paymentStatus === "Paid Via Link") {
				toast.success("Payment successful!");
				setTimeout(() => {
					window.location.reload();
				}, 3000);
			} else {
				toast.error("Payment not updated correctly.");
			}
		} catch (error) {
			toast.error("Payment processing failed.");
		}
	};

	const getColorName = (hexa) => {
		const colorObject = allColors.find((color) => color.hexa === hexa);
		return colorObject ? colorObject.color : hexa;
	};

	const canonicalUrl = `https://serenejannat.com/payment-link/${orderId}`;

	if (isLoading) {
		return <div>Loading...</div>;
	}

	return (
		<LinkGeneratedWrapper>
			<Helmet>
				<title>Payment Link | Serene Jannat</title>
				<meta
					name='description'
					content='Secure payment link for your order at Serene Jannat.'
				/>
				<meta name='robots' content='noindex, nofollow' />
				<link rel='canonical' href={canonicalUrl} />
			</Helmet>
			<OrderContainer>
				<h2>Order Summary</h2>
				<CustomerDetails>
					<h3>Customer Details</h3>
					<p>
						<strong>Name:</strong> {order.customerDetails.name}
					</p>
					<p>
						<strong>Email:</strong> {order.customerDetails.email}
					</p>
					<p>
						<strong>Phone:</strong> {order.customerDetails.phone}
					</p>
				</CustomerDetails>
				<ProductSection>
					<h3 style={{ fontSize: "1.3rem", fontWeight: "bold" }}>Products:</h3>
					{order.productsNoVariable.map((product) => (
						<Product key={product.productId}>
							<div className='row'>
								<div className='col-md-2'>
									<img src={product.image} alt={product.name} />
								</div>

								<div className='col-md-7'>
									<p>
										<strong>Name:</strong> {product.name}
									</p>
									<p>
										<strong>Quantity:</strong> {product.ordered_quantity}
									</p>
									<p>
										<strong>Price:</strong> ${product.price}
									</p>
								</div>
							</div>
						</Product>
					))}
					{order.chosenProductQtyWithVariables.map((product) => (
						<Product key={product.productId}>
							<div className='row'>
								<div className='col-md-2'>
									<img src={product.image} alt={product.name} />
								</div>
								<div className='col-md-7'>
									<p>
										<strong>Name:</strong> {product.name}
									</p>
									<p>
										<strong>Color:</strong>{" "}
										{getColorName(product.chosenAttributes.color)}
									</p>
									<p style={{ textTransform: "uppercase" }}>
										<strong>Size:</strong> {product.chosenAttributes.size}
									</p>
									<p>
										<strong>Quantity:</strong> {product.ordered_quantity}
									</p>
									<p>
										<strong>Price:</strong> ${product.price}
									</p>
								</div>
							</div>
						</Product>
					))}
				</ProductSection>
				<TotalAmount>
					<p>
						<strong>Total Amount:</strong> $
						{order.totalAmountAfterDiscount.toFixed(2)}
					</p>
				</TotalAmount>
				{order.paymentStatus === "Paid Via Link" ? (
					<PaymentSuccess>Thank you for your payment!</PaymentSuccess>
				) : (
					<SquarePaymentForm
						amount={order.totalAmountAfterDiscount}
						currency='USD'
						handlePaymentSuccess={handlePaymentSuccess}
						zipCode={order.customerDetails.zipcode}
					/>
				)}
			</OrderContainer>
		</LinkGeneratedWrapper>
	);
};

export default LinkGenerated;

const LinkGeneratedWrapper = styled.div`
	display: flex;
	justify-content: center;
	align-items: center;
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 20px;
	box-sizing: border-box;

	p {
		text-transform: capitalize;
	}
`;

const OrderContainer = styled.div`
	background: white;
	padding: 20px;
	border-radius: 10px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
	width: 100%;
	max-width: 800px;
	box-sizing: border-box;

	@media (max-width: 768px) {
		padding: 10px;
	}

	h2 {
		margin-bottom: 20px;
		text-align: center;
	}
`;

const CustomerDetails = styled.div`
	margin-bottom: 20px;

	h3 {
		margin-bottom: 10px;
	}

	p {
		margin: 5px 0;
	}
`;

const ProductSection = styled.div`
	margin-bottom: 20px;

	h3 {
		margin-bottom: 10px;
	}
`;

const Product = styled.div`
	margin-bottom: 10px;
	padding: 10px;
	border: 1px solid #ddd;
	border-radius: 5px;

	img {
		width: 100px;
		height: 100px;
		object-fit: cover;
		margin-bottom: 10px;
	}

	p {
		margin: 5px 0;
	}
`;

const TotalAmount = styled.div`
	font-size: 1.2em;
	font-weight: bold;
	margin-bottom: 20px;
	text-align: center;
`;

const PaymentSuccess = styled.h2`
	color: green;
	font-weight: bold;
	text-align: center;
`;

