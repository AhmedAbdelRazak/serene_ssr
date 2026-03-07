// src/NavbarUpdate/CartIconWithBadge.js
import React from "react";
import styled from "styled-components";
import { AiOutlineShoppingCart } from "react-icons/ai";
import { useCartContext } from "../cart_context";

const CartIconWithBadge = () => {
	const { total_items, openSidebar2 } = useCartContext();

	return (
		<CartIconWrapper onClick={openSidebar2}>
			<AiOutlineShoppingCart size={24} />
			{total_items > 0 && <Badge>{total_items}</Badge>}
		</CartIconWrapper>
	);
};

export default CartIconWithBadge;

const CartIconWrapper = styled.div`
	position: relative;
	cursor: pointer;
`;

const Badge = styled.span`
	position: absolute;
	top: -10px;
	right: -10px;
	background: red;
	color: white;
	border-radius: 50%;
	padding: 5px 10px;
	font-size: 12px;
	font-weight: bold;
`;
