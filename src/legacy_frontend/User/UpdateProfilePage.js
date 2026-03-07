import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { isAuthenticated, updateUserProfile, readUser } from "../auth";
import { updateUser } from "../apiCore";

import { Form, Input, Button, Typography, Alert } from "antd";
import {
	UserOutlined,
	MailOutlined,
	PhoneOutlined,
	LockOutlined,
	GoogleOutlined,
} from "@ant-design/icons";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";

const { Title } = Typography;

const UpdateProfilePage = () => {
	const [form] = Form.useForm();
	const [values, setValues] = useState({
		name: "",
		email: "",
		phone: "",
		password: "",
		confirmPassword: "",
		loading: false,
		authProvider: "local", // default
	});

	const {
		name,
		email,
		phone,
		password,
		confirmPassword,
		loading,
		authProvider,
	} = values;
	const { token } = isAuthenticated();
	const userId = isAuthenticated().user._id;

	const loadUserProfile = () => {
		readUser(userId, token).then((data) => {
			if (data.error) {
				toast.error(data.error);
			} else {
				// Save user data to state
				setValues((prev) => ({
					...prev,
					name: data.name,
					email: data.email,
					phone: data.phone,
					authProvider: data.authProvider || "local",
				}));

				// Populate the AntD form fields
				form.setFieldsValue({
					name: data.name,
					email: data.email,
					phone: data.phone,
				});
			}
		});
	};

	useEffect(() => {
		loadUserProfile();
		// eslint-disable-next-line
	}, []);

	// Simple event handler for all fields
	const handleChange = (fieldName) => (e) => {
		setValues({ ...values, [fieldName]: e.target.value });
	};

	// Validation helpers
	const validateEmail = (inputEmail) => {
		const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
		return re.test(String(inputEmail).toLowerCase());
	};

	const validatePhone = (inputPhone) => {
		// 1) Remove all non-digits
		const phoneNumber = inputPhone.replace(/[^\d]/g, "");

		// 2) Check length is between 8 and 12
		if (phoneNumber.length < 8 || phoneNumber.length > 12) {
			return false;
		}

		// 3) Check not all digits are the same
		//    (e.g. "11111111" or "999999999" should fail)
		const allSame = phoneNumber
			.split("")
			.every((digit) => digit === phoneNumber[0]);
		if (allSame) {
			return false;
		}

		// If all checks pass, return true
		return true;
	};

	const validateName = (inputName) => {
		const parts = inputName.trim().split(" ");
		return parts.length >= 2 && parts.every((part) => part.length > 0);
	};

	const handleSubmit = () => {
		const plainPhone = phone.replace(/[^\d]/g, ""); // remove formatting

		// 1) Validate name, email, phone for everyone
		if (!validateName(name)) {
			toast.error("Please add your full name");
			return;
		}
		if (!validateEmail(email)) {
			toast.error("Please enter a valid email address");
			return;
		}
		if (!validatePhone(plainPhone)) {
			toast.error("Please enter a valid US phone number");
			return;
		}

		// 2) If user is local, and they typed a password, validate it
		//    If user is google, skip password checks entirely
		if (authProvider === "local" && password) {
			if (password.length < 6) {
				toast.error("Password must be at least 6 characters long");
				return;
			}
			if (password !== confirmPassword) {
				toast.error("Passwords don't match, please try again");
				return;
			}
		}

		// 3) Mark loading
		setValues({ ...values, loading: true });

		// 4) Build user update object
		const userPayload = {
			name,
			email,
			phone: plainPhone,
		};

		// Only include password if local user typed one
		if (authProvider === "local" && password) {
			userPayload.password = password;
		}

		// 5) Call updateUserProfile
		updateUserProfile(userId, token, userPayload).then((data) => {
			if (data.error) {
				toast.error(data.error);
				setValues({ ...values, loading: false });
			} else {
				// Update localStorage user so changes reflect in nav etc.
				updateUser(data, () => {
					toast.success("Profile updated successfully");
					setValues({
						...values,
						password: "",
						confirmPassword: "",
						loading: false,
					});
				});
			}
		});
	};

	return (
		<ProfileWrapper>
			<Title level={2} className='text-center'>
				Update Profile
			</Title>

			{/* Show a note if the user is Google-based */}
			{authProvider === "google" && (
				<div style={{ marginBottom: 16 }}>
					<Alert
						message='Google Account'
						description='You registered via Google. No password is required.'
						type='info'
						showIcon
						icon={<GoogleOutlined style={{ color: "#ea4335" }} />}
					/>
				</div>
			)}

			<FormWrapper>
				<Form
					form={form}
					onFinish={handleSubmit}
					layout='vertical'
					initialValues={{ name, email, phone }}
				>
					<Form.Item
						label='Full Name'
						name='name'
						rules={[
							{ required: true, message: "Please input your full name!" },
						]}
					>
						<Input
							prefix={<UserOutlined />}
							value={name}
							onChange={handleChange("name")}
							placeholder='Full Name'
						/>
					</Form.Item>

					<Form.Item
						label='Email'
						name='email'
						rules={[{ required: true, message: "Please input your email!" }]}
					>
						<Input
							prefix={<MailOutlined />}
							value={email}
							onChange={handleChange("email")}
							placeholder='Email'
						/>
					</Form.Item>

					<Form.Item
						label='Phone'
						name='phone'
						rules={[
							{ required: true, message: "Please input your phone number!" },
						]}
					>
						<Input
							prefix={<PhoneOutlined />}
							value={phone}
							onChange={handleChange("phone")}
							placeholder='Phone'
						/>
					</Form.Item>

					{/* Show password fields ONLY if user is local */}
					{authProvider === "local" && (
						<>
							<Form.Item label='Password' name='password'>
								<Input.Password
									prefix={<LockOutlined />}
									value={password}
									onChange={handleChange("password")}
									placeholder='Password'
								/>
							</Form.Item>

							<Form.Item label='Confirm Password' name='confirmPassword'>
								<Input.Password
									prefix={<LockOutlined />}
									value={confirmPassword}
									onChange={handleChange("confirmPassword")}
									placeholder='Confirm Password'
								/>
							</Form.Item>
						</>
					)}

					<Form.Item>
						<Button type='primary' htmlType='submit' block loading={loading}>
							Update Profile
						</Button>
					</Form.Item>
				</Form>
			</FormWrapper>

			<ToastContainer className='toast-top-center' position='top-center' />
		</ProfileWrapper>
	);
};

export default UpdateProfilePage;

/* ------------ Styled Components ------------ */

const ProfileWrapper = styled.div`
	padding: 20px;
	max-width: 600px;
	margin: 0 auto;
`;

const FormWrapper = styled.div`
	background-color: #f9f9f9;
	padding: 20px;
	border-radius: 3px;
	box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;
