import React from "react";
import styled from "styled-components";

const ContactCustomerServicePage = () => {
	return (
		<ContactWrapper>
			<h2>Contact Customer Service</h2>
			<p>This is where the contact customer service form or details will go.</p>
		</ContactWrapper>
	);
};

export default ContactCustomerServicePage;

const ContactWrapper = styled.div`
	padding: 20px;
	background-color: #005f4e;
	color: #ffffff;

	h2 {
		color: #ffffff;
	}

	p {
		color: #d9d9d9;
	}
`;
