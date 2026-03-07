import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import { Input as AntdInput } from "antd";
import { EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { isAuthenticated } from "../../auth";

const Z2StepOne = ({
	step,
	customerDetails,
	handleCustomerDetailChange,
	handleNextStep,
	passwordError,
	accountType,
	handleAccountTypeChange,
}) => {
	const [errors, setErrors] = useState({
		name: false,
		email: false,
		phone: false,
		password: false,
		confirmPassword: false,
	});

	const isUserAuthenticated = isAuthenticated() && isAuthenticated().user;

	return (
		<>
			{step === 1 && (
				<Step>
					<StepTitle>Customer Details</StepTitle>
					<Input
						type='text'
						name='name'
						placeholder='Full Name (First & Last Names'
						value={customerDetails.name}
						onChange={handleCustomerDetailChange}
						className={errors.name ? "error" : ""}
					/>
					<Input
						type='email'
						name='email'
						placeholder='Email'
						value={customerDetails.email}
						onChange={handleCustomerDetailChange}
						className={errors.email ? "error" : ""}
					/>
					<Input
						type='tel'
						name='phone'
						placeholder='Phone'
						value={customerDetails.phone}
						onChange={handleCustomerDetailChange}
						className={errors.phone ? "error" : ""}
					/>

					{!isUserAuthenticated && (
						<AccountTypeWrapper>
							<label>
								<input
									type='radio'
									name='accountType'
									value='create'
									checked={accountType === "create"}
									onChange={(e) => handleAccountTypeChange(e.target.value)}
								/>
								<span>Create an Account</span>
							</label>
							<label>
								<input
									type='radio'
									name='accountType'
									value='guest'
									checked={accountType === "guest"}
									onChange={(e) => handleAccountTypeChange(e.target.value)}
								/>
								<span>Checkout as a Guest</span>
							</label>
						</AccountTypeWrapper>
					)}

					{accountType === "create" && (
						<PasswordWrapper>
							<PasswordInputWrapper>
								<AntdInput.Password
									className={`password-input ${errors.password ? "error" : ""}`}
									name='password'
									placeholder='Password'
									value={customerDetails.password}
									onChange={handleCustomerDetailChange}
									iconRender={(visible) =>
										visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
									}
								/>
							</PasswordInputWrapper>
							<PasswordInputWrapper>
								<AntdInput.Password
									className={`password-input ${errors.confirmPassword ? "error" : ""}`}
									name='confirmPassword'
									placeholder='Confirm Password'
									value={customerDetails.confirmPassword}
									onChange={handleCustomerDetailChange}
									iconRender={(visible) =>
										visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
									}
								/>
							</PasswordInputWrapper>
						</PasswordWrapper>
					)}

					{passwordError && <Error>{passwordError}</Error>}
					<ButtonWrapper>
						<ContinueButton onClick={() => handleNextStep(errors, setErrors)}>
							Continue
						</ContinueButton>
					</ButtonWrapper>
				</Step>
			)}
		</>
	);
};

export default Z2StepOne;

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateX(100%);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const Step = styled.div`
	display: flex;
	flex-direction: column;
	animation: ${fadeIn} 0.5s forwards;
`;

const StepTitle = styled.h2`
	text-align: center;
	margin-bottom: 20px;
	font-weight: bold;
	font-size: 1.2rem;
	border-bottom: 3px solid #ccc;
	width: 25%;
	margin-left: auto;
	margin-right: auto;
	padding-bottom: 5px;

	@media (max-width: 790px) {
		width: 80%;
	}
`;

const Input = styled.input`
	padding: 10px;
	margin: 10px 0;
	border: 1px solid #ccc;
	border-radius: 5px;
	font-size: 1rem;

	&.error {
		border-color: #ff6b6b; /* Light reddish color for error */
	}
`;

const ButtonWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	margin-top: 20px;
	@media (max-width: 768px) {
		flex-direction: column;
		align-items: center;
	}
`;

const ContinueButton = styled.button`
	padding: 10px 20px;
	background: black;
	color: white;
	border: none;
	font-size: 14px;
	transition: 0.3s;
	width: 25%;
	border-radius: 5px;
	cursor: pointer;
	&:hover {
		background: #005f4e;
	}
	@media (max-width: 768px) {
		width: 100%;
		margin-bottom: 10px;
	}
`;

const PasswordWrapper = styled.div`
	display: flex;
	justify-content: space-between;
	width: 100% !important;
	gap: 10px;

	@media (max-width: 768px) {
		flex-direction: column;
	}
`;

const PasswordInputWrapper = styled.div`
	width: 100%;
`;

const Error = styled.p`
	color: red;
	font-size: 0.9rem;
	text-align: center;
`;

const AccountTypeWrapper = styled.div`
	display: flex;
	justify-content: center;
	margin: 20px 0;

	label {
		display: flex;
		align-items: center;
		font-size: 1rem;
		font-weight: bold;
		margin-right: 20px;

		input {
			margin-right: 5px;
		}
	}

	@media (max-width: 768px) {
		flex-direction: column;
		align-items: flex-start;
		label {
			margin-bottom: 10px;
			margin-right: 0;
		}
	}
`;
