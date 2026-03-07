/** @format */
import React, { useEffect, useState } from "react";
import { Link, Redirect } from "react-router-dom";
import { Form, Input, Button, Typography, Row, Col, Card } from "antd";
import {
	UserOutlined,
	LockOutlined,
	MailOutlined,
	PhoneOutlined,
} from "@ant-design/icons";

// 1) IMPORT GOOGLE LOGIN & AXIOS
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";

import { signup, authenticate, isAuthenticated, signin } from "../auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { Helmet } from "react-helmet-async";
import ReactGA from "react-ga4";

const { Title } = Typography;

const Register = () => {
	const [values, setValues] = useState({
		name: "",
		email: "",
		phone: "",
		password: "",
		password2: "",
		error: "",
		success: false,
		misMatch: false,
		loading: false,
	});

	const { name, email, phone, password, password2, loading } = values;

	// ---------------------------
	//  Google Login Success
	// ---------------------------
	const handleGoogleSuccess = async (credentialResponse) => {
		try {
			const { credential } = credentialResponse;
			if (!credential) {
				return toast.error("No credential returned from Google");
			}
			setValues({ ...values, loading: true });

			// POST to your backend /google-login endpoint
			const { data } = await axios.post(
				`${process.env.REACT_APP_API_URL}/google-login`,
				{ idToken: credential }
			);

			setValues({ ...values, loading: false });

			// If there's an error coming from the server:
			if (data.error) {
				return toast.error(data.error);
			}

			// If successful, store token & user, then refresh or redirect
			authenticate(data, () => {
				window.location.reload(false);
			});
		} catch (error) {
			console.error("Google signup error:", error);
			toast.error("Google signup failed. Please try again.");
			setValues({ ...values, loading: false });
		}
	};

	// ---------------------------
	//  Normal signup flow
	// ---------------------------
	const handleChange = (name) => (event) => {
		setValues({
			...values,
			error: false,
			misMatch: false,
			[name]: event.target.value,
		});
	};

	const formatPhoneNumber = (value) => {
		if (!value) return value;
		const phoneNumber = value.replace(/[^\d]/g, "");
		const phoneNumberLength = phoneNumber.length;

		if (phoneNumberLength < 4) return phoneNumber;
		if (phoneNumberLength < 7) {
			return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3)}`;
		}
		return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(
			3,
			6
		)}-${phoneNumber.slice(6, 10)}`;
	};

	const handlePhoneChange = (event) => {
		const formattedPhoneNumber = formatPhoneNumber(event.target.value);
		setValues({
			...values,
			phone: formattedPhoneNumber,
		});
	};

	const validateEmail = (email) => {
		const re = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
		return re.test(String(email).toLowerCase());
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

	const validateName = (name) => {
		const parts = name.trim().split(" ");
		return parts.length >= 2 && parts.every((part) => part.length > 0);
	};

	const clickSubmit = async () => {
		const plainPhone = phone.replace(/[^\d]/g, "");
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

		if (password.length < 6) {
			toast.error("Password must be at least 6 characters long");
			return;
		}

		if (password !== password2) {
			setValues({
				...values,
				success: false,
				misMatch: true,
			});
			return toast.error("Passwords don't match, please try again");
		}

		setValues({ ...values, error: false, misMatch: false, loading: true });

		try {
			const data = await signup({ name, email, phone: plainPhone, password });
			if (data.error) {
				setValues({
					...values,
					error: data.error,
					success: false,
					loading: false,
				});
				toast.error(data.error);
			} else {
				const signinData = await signin({ emailOrPhone: email, password });
				if (signinData.error) {
					setValues({ ...values, error: signinData.error, loading: false });
					toast.error(signinData.error);
				} else {
					authenticate(signinData, () => {
						setValues({
							...values,
							success: true,
							loading: false,
						});
						window.location.reload(false);
					});
				}
			}
		} catch (error) {
			setValues({ ...values, error: error.message, loading: false });
			toast.error(error.message);
		}
	};

	const redirectUser = () => {
		if (isAuthenticated()) {
			return <Redirect to='/' />;
		}
	};

	useEffect(() => {
		ReactGA.send(window.location.pathname + window.location.search);
		// eslint-disable-next-line
	}, [window.location.pathname]);

	const signUpForm = () => (
		<Row justify='center' style={{ marginTop: "50px" }}>
			<Col xs={24} sm={20} md={16} lg={12} xl={8}>
				<Card>
					<Title level={2} className='text-center'>
						Account <span className='text-primary'>Register</span>
					</Title>
					<Form onFinish={clickSubmit} layout='vertical'>
						<Form.Item
							name='name'
							label='Full Name'
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
							name='email'
							label='Email'
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
							name='phone'
							label='Phone'
							rules={[
								{ required: true, message: "Please input your phone number!" },
							]}
						>
							<Input
								prefix={<PhoneOutlined />}
								value={phone}
								onChange={handlePhoneChange}
								placeholder='Phone'
							/>
						</Form.Item>
						<Form.Item
							name='password'
							label='Password'
							rules={[
								{ required: true, message: "Please input your password!" },
							]}
						>
							<Input.Password
								prefix={<LockOutlined />}
								value={password}
								onChange={handleChange("password")}
								placeholder='Password'
							/>
						</Form.Item>
						<Form.Item
							name='password2'
							label='Confirm Password'
							rules={[
								{ required: true, message: "Please confirm your password!" },
							]}
						>
							<Input.Password
								prefix={<LockOutlined />}
								value={password2}
								onChange={handleChange("password2")}
								placeholder='Confirm Password'
							/>
						</Form.Item>
						<Form.Item>
							<Button type='primary' htmlType='submit' block loading={loading}>
								Register
							</Button>
						</Form.Item>
					</Form>

					{/* 
            ------------------------------------------------------
            ADD THE GOOGLE LOGIN BUTTON 
            ------------------------------------------------------
          */}
					<Form.Item style={{ textAlign: "center", marginBottom: "0" }}>
						<GoogleLogin
							onSuccess={handleGoogleSuccess}
							onError={() => {
								toast.error("Google signup error. Try again.");
							}}
						/>
					</Form.Item>

					<hr />
					<p style={{ textAlign: "center" }}>
						If you already have an account, please{" "}
						<Link to='/signin' className='btn btn-sm btn-outline-primary'>
							Login Here
						</Link>
					</p>
				</Card>
			</Col>
		</Row>
	);

	return (
		<div
			style={{
				background: "#dbe4eb",
				paddingBottom: "15px",
				minHeight: "800px",
			}}
		>
			<Helmet>
				<meta charSet='utf-8' />
				<title>Serene Jannat Online Shop | Account Register</title>
				<meta
					name='description'
					content='Register for an account at Serene Jannat to access exclusive offers and manage your orders...'
				/>
				<meta name='keywords' content='Serene Jannat, register, account...' />
				<meta
					property='og:title'
					content='Serene Jannat Online Shop | Account Register'
				/>
				<meta property='og:description' content='Register for an account...' />
				<meta property='og:image' content='%PUBLIC_URL%/logo192.png' />
				<meta property='og:url' content='https://serenejannat.com/signup' />
				<meta property='og:type' content='website' />
				<meta property='og:locale' content='en_US' />
				<link rel='icon' href='gq_frontend/src/GeneralImgs/favicon.ico' />
				<link rel='canonical' href='https://serenejannat.com/signup' />
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							"@context": "https://schema.org",
							"@type": "Organization",
							url: "https://serenejannat.com",
							name: "Serene Jannat",
							logo: "https://serenejannat.com/logo192.png",
							sameAs: [
								"https://www.facebook.com/profile.php?id=61575325586166",
							],
						}),
					}}
				/>
			</Helmet>
			<br />
			<ToastContainer className='toast-top-center' position='top-center' />
			{signUpForm()}
			{redirectUser()}
		</div>
	);
};

export default Register;


