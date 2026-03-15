/** @format */
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { authenticate, isAuthenticated, signin } from "../auth";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.min.css";
import { Helmet } from "react-helmet-async";
import ReactPixel from "react-facebook-pixel";
import { Form, Input, Button, Typography, Row, Col, Card } from "antd";
import { MailOutlined, PhoneOutlined, LockOutlined } from "@ant-design/icons";
import ReactGA from "react-ga4";

// 1) Import GoogleLogin & axios
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useCartContext } from "../cart_context";

const { Title } = Typography;

const Login = ({ history }) => {
	const [values, setValues] = useState({
		emailOrPhone: "",
		password: "",
		loading: false,
		redirectToReferrer: false,
	});
	const { emailOrPhone, password, loading, redirectToReferrer } = values;
	const { user } = isAuthenticated();
	const { websiteSetup } = useCartContext();

	// ----------------------------------------------
	//  Google Login success
	// ----------------------------------------------
	const handleGoogleSuccess = async (credentialResponse) => {
		try {
			const { credential } = credentialResponse;
			if (!credential) {
				return toast.error("No credential returned from Google");
			}
			setValues({ ...values, loading: true });

			// POST to your backend route
			const { data } = await axios.post(
				`${process.env.REACT_APP_API_URL}/google-login`,
				{ idToken: credential }
			);

			setValues({ ...values, loading: false });

			if (data.error) {
				return toast.error(data.error);
			}

			// If the user is deactivated
			if (data.user?.activeUser === false) {
				return toast.error(
					"User was deactivated, Please reach out to the admin site"
				);
			}

			// Otherwise, authenticate & redirect
			authenticate(data, () => {
				if (data.user.role === 1) {
					window.location.href = "/admin/dashboard";
				} else if (data.user.role === 2000) {
					window.location.href = "/seller/dashboard";
				} else if (data.user.role === 4) {
					window.location.href = "/operations/sales-history";
				} else {
					window.location.href = "/";
				}
			});
		} catch (error) {
			console.error("Google login error:", error);
			toast.error("Google login failed. Please try again.");
			setValues({ ...values, loading: false });
		}
	};

	// ----------------------------------------------
	//  Normal signin flow (unchanged)
	// ----------------------------------------------
	const handleChange = (name) => (event) => {
		setValues({ ...values, error: false, [name]: event.target.value });
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
			emailOrPhone: formattedPhoneNumber,
		});
	};

	const clickSubmit = (valuesFromForm) => {
		setValues({ ...values, error: false, loading: true });
		signin({
			emailOrPhone: valuesFromForm.emailOrPhone,
			password: valuesFromForm.password,
		}).then((data) => {
			if (data.error) {
				setValues({ ...values, error: data.error, loading: false });
				toast.error(data.error);
			} else if (data.user.activeUser === false) {
				setValues({ ...values, error: data.error, loading: false });
				return toast.error(
					"User was deactivated, Please reach out to the admin site"
				);
			} else {
				authenticate(data, () => {
					if (data.user.role === 1) {
						window.location.href = "/admin/dashboard";
					} else if (data.user.role === 3) {
						window.location.href = "/order-taker/create-new-order";
					} else if (data.user.role === 4) {
						window.location.href = "/operations/sales-history";
					} else {
						window.location.href = "/";
					}
				});
			}
		});
	};

	const showLoading = () =>
		loading && (
			<div className='alert alert-info'>
				<h2>Loading...</h2>
			</div>
		);

	const redirectUser = () => {
		if (redirectToReferrer) {
			if (user.user.role === 1) {
				window.location.href = "/admin/dashboard";
			} else if (user.user.role === 3) {
				window.location.href = "/order-taker/create-new-order";
			} else if (user.user.role === 4) {
				window.location.href = "/operations/sales-history";
			} else {
				window.location.href = "/";
			}
		}
	};

	// Facebook Pixel
	useEffect(() => {
		const options = { autoConfig: true, debug: false };
		ReactPixel.init(process.env.REACT_APP_FACEBOOK_PIXEL_ID, options);
		ReactPixel.pageView();
	}, []);

	// Google Analytics
	useEffect(() => {
		ReactGA.send(window.location.pathname + window.location.search);
		// eslint-disable-next-line
	}, [window.location.pathname]);

	// ----------------------------------------------
	//  Render form with GoogleLogin button
	// ----------------------------------------------
	const signinForm = () => (
		<Row justify='center' style={{ marginTop: "50px" }}>
			<Col xs={24} sm={20} md={17} lg={14} xl={15}>
				<Card>
					<div className='text-center mb-4'>
						<img
							src={websiteSetup.sereneJannatLogo.url}
							alt='Store Logo'
							style={{ maxWidth: "150px" }}
						/>
					</div>

					<Title level={2} className='text-center'>
						Account <span className='text-primary'>Login</span>
					</Title>

					<Form onFinish={clickSubmit} layout='vertical'>
						<Form.Item
							name='emailOrPhone'
							label='Email or Phone'
							rules={[
								{
									required: true,
									message: "Please input your email or phone!",
								},
							]}
						>
							<Input
								prefix={
									emailOrPhone.includes("@") ? (
										<MailOutlined />
									) : (
										<PhoneOutlined />
									)
								}
								value={emailOrPhone}
								onChange={
									emailOrPhone.includes("@")
										? handleChange("emailOrPhone")
										: handlePhoneChange
								}
								placeholder='Email / Phone'
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

						<Form.Item>
							<Button type='primary' htmlType='submit' block loading={loading}>
								Login
							</Button>
						</Form.Item>
					</Form>

					{/* OPTIONAL: "OR" divider */}
					<p style={{ textAlign: "center", margin: "1rem 0 0.5rem" }}>OR</p>

					<div style={{ textAlign: "center" }}>
						{/* 2) Google login button */}
						<GoogleLogin
							onSuccess={handleGoogleSuccess}
							onError={() => {
								toast.error("Google login error. Try again.");
							}}
						/>
					</div>

					<hr />
					<p style={{ textAlign: "center" }}>
						Forgot Your Password? Please{" "}
						<Link to='#' className='btn btn-sm btn-outline-danger'>
							Reset Your Password
						</Link>
					</p>
				</Card>
			</Col>
		</Row>
	);

	return (
		<WholeSignin>
			<Helmet>
				<meta charSet='utf-8' />
				<title>Serene Jannat Gift Shop | Account Login</title>
				<meta
					name='description'
					content='Login to your Serene Jannat account to access exclusive offers...'
				/>
				<meta name='keywords' content='Serene Jannat, login, account...' />
				<meta
					property='og:title'
					content='Serene Jannat Gift Shop | Account Login'
				/>
				<meta
					property='og:description'
					content='Login to your Serene Jannat account to access exclusive offers...'
				/>
				<meta property='og:image' content={websiteSetup.sereneJannatLogo.url} />
				<meta property='og:url' content='https://serenejannat.com/signin' />
				<meta property='og:type' content='website' />
				<meta property='og:locale' content='en_US' />
				<link rel='icon' href='/favicon.ico' />
				<link rel='canonical' href='https://serenejannat.com/signin' />
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

			<ToastContainer />
			{showLoading()}

			<div className='row'>
				<div className='col-md-8 mx-auto'>{signinForm()}</div>
			</div>
			{redirectUser()}
		</WholeSignin>
	);
};

export default Login;

const WholeSignin = styled.div`
	overflow-x: hidden;
	min-height: 700px;
	margin: 0px !important;

	.storeName {
		color: darkred;
		letter-spacing: 5px;
		font-size: 1.8rem;
		font-weight: bold;
	}

	@media (max-width: 1000px) {
		.infiniteAppsLogo {
			width: 48px;
			height: 48px;
		}
	}
`;

