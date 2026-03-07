import React from "react";
import { Input, InputNumber, Switch, Tooltip } from "antd";
import { QuestionCircleOutlined } from "@ant-design/icons";
import styled from "styled-components";

const StoreBasicInfo = ({ storeData, setStoreData }) => {
	const handleChange = (field, value) => {
		setStoreData((prev) => ({ ...prev, [field]: value }));
	};

	return (
		<StoreBasicInfoWrapper>
			<h3>Basic Store Information</h3>

			<div className='row'>
				<div className='col-md-4' style={{ marginBottom: 20 }}>
					<label>
						Store Name{" "}
						<Tooltip title='The name of your store as displayed to customers'>
							<QuestionCircleOutlined className='infoIcon' />
						</Tooltip>
					</label>
					<Input
						value={storeData.addStoreName}
						onChange={(e) => handleChange("addStoreName", e.target.value)}
					/>
				</div>
				<div className='col-md-3' style={{ marginBottom: 20 }}>
					<label>
						Store Phone{" "}
						<Tooltip title='Public phone number for customer queries or support'>
							<QuestionCircleOutlined className='infoIcon' />
						</Tooltip>
					</label>
					<Input
						value={storeData.storePhone}
						onChange={(e) => handleChange("storePhone", e.target.value)}
					/>
				</div>
			</div>

			<div style={{ marginBottom: 20 }}>
				<label>
					Store Address{" "}
					<Tooltip title='Physical address of your store (for display or shipping returns)'>
						<QuestionCircleOutlined className='infoIcon' />
					</Tooltip>
				</label>
				<Input
					value={storeData.storeAddress}
					onChange={(e) => handleChange("storeAddress", e.target.value)}
				/>
			</div>

			<div className='row'>
				<div className='col-md-3' style={{ marginBottom: 20 }}>
					<label>
						Loyalty Points To Award{" "}
						<Tooltip title='How many points the customer should obtain in order to be awarded (100 means the customer should reach 100 points of purchases in your store to be awarded) (if applicable)'>
							<QuestionCircleOutlined className='infoIcon' />
						</Tooltip>
					</label>
					<InputNumber
						min={0}
						value={storeData.loyaltyPointsAward}
						onChange={(val) => handleChange("loyaltyPointsAward", val)}
					/>
				</div>

				<div className='col-md-3' style={{ marginBottom: 20 }}>
					<label>
						Loyalty Points Award Discount{" "}
						<Tooltip title='The % off of user purchase if he/ she reached the target points (e.g. 10 means 10%)'>
							<QuestionCircleOutlined className='infoIcon' />
						</Tooltip>
					</label>
					<InputNumber
						min={0}
						max={100}
						value={storeData.discountPercentage}
						onChange={(val) => handleChange("discountPercentage", val)}
					/>
				</div>
			</div>

			<div className='row'>
				<div className='col-md-3'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Transaction Fee %{" "}
							<Tooltip title='Fixed fee percentage charged by the platform on each transaction. This cannot be changed.'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<InputNumber
							min={0}
							max={100}
							value={storeData.transactionFeePercentage}
							disabled
						/>
					</div>
				</div>
				<div className='col-md-3'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Purchase Taxes{" "}
							<Tooltip title='Tax percentage automatically applied to orders if needed'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<InputNumber
							min={0}
							value={storeData.purchaseTaxes}
							onChange={(val) => handleChange("purchaseTaxes", val)}
						/>
					</div>
				</div>

				<div className='col-md-3'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Free Shipping Limit{" "}
							<Tooltip title='Minimum order amount for which shipping is free'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<InputNumber
							min={0}
							value={storeData.freeShippingLimit}
							onChange={(val) => handleChange("freeShippingLimit", val)}
						/>
					</div>
				</div>

				<div className='col-md-3'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Discount On First Purchase (%){" "}
							<Tooltip title='Special discount for a customer’s very first order'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<InputNumber
							min={0}
							max={100}
							value={storeData.discountOnFirstPurchase}
							onChange={(val) => handleChange("discountOnFirstPurchase", val)}
						/>
					</div>
				</div>
			</div>

			<div className='row'>
				<div className='col-md-2'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Activate Pay On Delivery{" "}
							<Tooltip title='Currently disabled—no cash on delivery allowed.'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<Switch checked={storeData.activatePayOnDelivery} disabled />
					</div>
				</div>

				<div className='col-md-2'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Activate Pickup In Store{" "}
							<Tooltip title='Allow customers to pick up orders from store'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<Switch
							checked={storeData.activatePickupInStore}
							onChange={(val) => handleChange("activatePickupInStore", val)}
						/>
					</div>
				</div>
				<div className='col-md-2'>
					<div style={{ marginBottom: 20 }}>
						<label>
							Activate Pay Online{" "}
							<Tooltip title='Enable credit card or online payment gateways'>
								<QuestionCircleOutlined className='infoIcon' />
							</Tooltip>
						</label>
						<Switch
							checked={storeData.activatePayOnline}
							onChange={(val) => handleChange("activatePayOnline", val)}
						/>
					</div>
				</div>
			</div>
		</StoreBasicInfoWrapper>
	);
};

export default StoreBasicInfo;

const StoreBasicInfoWrapper = styled.div`
	label {
		padding: 2px;
	}
	.infoIcon {
		margin-left: 5px;
		color: #999;
		cursor: pointer;
		transition: color 0.2s;
	}
	.infoIcon:hover {
		color: #333;
	}
`;
